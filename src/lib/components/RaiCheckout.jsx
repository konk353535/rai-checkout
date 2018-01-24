import React, { Component } from "react";
import moment from 'moment';
import NumberFormat from 'react-number-format';
import Modal from 'react-modal';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import './RaiCheckout.css'

let checkInterval;
let timerInterval;

let BASE_URL = 'https://arrowpay.io';
const CURRENCIES = {
  'USD': '$',
  'EUR': '€'
}

export default class RaiCheckout extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      account_to: '',
      durationPassed: null,
      public_key: '',
      error: '',
      copiedAmount: false,
      copiedAddress: false,
      amount_XRB: null,
      amount_usd: 0,
      token: null,
      completed: false,
      completed_at: null
    }

    if (this.props.dev) {
      BASE_URL = 'http://localhost:3001';
    }
  }

  onPaymentConfirmed({ token, item_id }) {
    this.props.onPaymentConfirmed({ token, item_id });
  }

  purchase() {
    // Init the purchase
    fetch(`${BASE_URL}/api/payment/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        public_key: this.props.public_key,
        item_id: this.props.item_id,
        payment: {
          currency: this.props.payment.currency,
          amount: this.props.payment.amount
        }
      })
    }).then((resRaw) => {
      return resRaw.json();
    }).then((res) => {

      this.setState({
        account_to: res.account_to,
        started_at: moment().toDate(),
        amount_XRB: res.amount_XRB,
        amount_usd: res.amount_usd,
        token: res.token,
        completed: false,
        completed_at: null
      });

      this.pendingPurchase();

      timerInterval = setInterval(() => {
        this.updateSecondsPassed();
      }, 1000);
    }).catch((err) => {
      console.log(err);
      return this.setState({
        error: err
      })
    });
  }

  pendingPurchase() {
    if (this.state.account_to) {
      fetch(`${BASE_URL}/api/payment/await`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: this.state.token })
      }).then((resRaw) => {
        return resRaw.json();
      }).then((res) => {
        if (res) {
          // CLIENT should perform there custom logic here (pending payment)
          this.onPaymentConfirmed({ token: this.state.token, item_id: this.props.item_id });
          setTimeout(() => {
            this.checkPurchase();
          }, 50);
        } else {
          setTimeout(() => {
            this.pendingPurchase();
          }, 1000);
        }
      }).catch((err) => {
        console.log(err);
        setTimeout(() => {
          this.pendingPurchase();
        }, 1000);
      });
    }
  }

  checkPurchase(attempt = 0) {
    fetch(`${BASE_URL}/api/payment/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: this.state.token })
    }).then((resRaw) => {
      return resRaw.json();
    }).then((res) => {
      if (res.completed_at) {
        clearInterval(checkInterval);
        clearInterval(timerInterval);
        this.setState({
          completed_at: res.completed_at,
          completed: true
        });

        setTimeout(() => {
          this.setState({
            account_to: '',
            amount_XRB: null
          });
        }, 3000);
      } else {
        if (attempt < 10) {
          setTimeout(() => {
            this.checkPurchase(attempt + 1);
          }, attempt * 1000);
        }
      }
    });
  }

  updateSecondsPassed() {
    const durationPassed = moment.duration(moment().diff(this.state.started_at));

    if (durationPassed > 10 * 60 * 1000) {
      return this.closeModal();
    }

    this.setState({
      durationPassed
    })
  }

  closeModal() {
    this.setState({
      account_to: '',
      token: null
    });
    clearInterval(timerInterval);
    clearInterval(checkInterval);
  }

  copied(field) {
    const modifier = {};
    modifier[field] = true;
    this.setState(modifier);
    setTimeout(() => {
      const revertModifier = {};
      revertModifier[field] = false;
      this.setState(revertModifier);
    }, 2000)
  }

  render() {
    const account_to = this.state.account_to;
    const amount_XRB = this.state.amount_XRB;
    let amount_usd = this.state.amount_usd.toFixed(2);
    const durationPassed = this.state.durationPassed;
    const redDuration = durationPassed > 5 * 60 * 1000;
    const durationRemaining = (10 * 60 * 1000) - durationPassed;
    const classes = this.props.classes;

    const currency = this.props.payment.currency;

    let fiatCurrency = 'USD';
    if (currency !== 'USD' && currency !== 'XRB') {
      fiatCurrency = currency;
    }

    const fiatSymbol = CURRENCIES[fiatCurrency];

    return (
      <div className="arrowpay-checkout">
        <div>
          {
            account_to ?
              <Modal
                isOpen={true}
                contentLabel="Modal"
                className="ReactModal__Content arrowpay-checkout"
              >
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  outline: 'none'
                }}>
                  <div className="bg-primary px-3" style={{
                    display: 'flex',
                    paddingTop: '0.5rem',
                    paddingBottom: '0.5rem',
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4
                  }}>
                    <div style={{color: '#FFF', display: 'flex', alignItems: 'center'}}>
                      <img src="http://arrowpay.io/arrowLogoWhite.png" style={{marginRight: '0.25rem'}} height={18} />
                      <span>ArrowPay</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      flex: 1
                    }}>
                      <button
                        type="button"
                        className="close"
                        data-dismiss="modal"
                        aria-label="Close"
                        onClick={() => this.closeModal()}
                      >
                        <svg viewPort="0 0 12 12" version="1.1"
                             xmlns="http://www.w3.org/2000/svg"
                             width={14} height={14}>
                            <line x1="1" y1="11" 
                                  x2="11" y2="1" 
                                  stroke="black" 
                                  stroke-width="2"/>
                            <line x1="1" y1="1" 
                                  x2="11" y2="11" 
                                  stroke="black" 
                                  stroke-width="2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flex: 1 }}>
                    <div className="rai-modal-body" style={{
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1
                    }}>
                      <div
                        className="px-3 py-3"
                        style={{
                          backgroundColor: '#FAFAFA',
                          borderBottom: '1px solid #DFDFDF',
                          display: 'flex',
                          marginBottom: '1rem',
                          fontSize: 14 
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                          <div><b>{this.props.title}</b></div>
                          <div>{this.props.sub_title}</div>
                        </div>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          flex: 1
                        }}>
                          <div>Total</div>
                          <div>{fiatSymbol}{amount_usd} {fiatCurrency}</div>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1
                      }}>
                        <div className="px-3" style={{marginBottom: '1rem'}}>
                          <div style={{marginBottom: '0.25rem'}}>To</div>
                          <div className="input-group copyable-group">
                            <input type="text" className="form-control" value={account_to} disabled={true} />
                            <div className="input-group-btn">
                              <CopyToClipboard text={account_to} onCopy={() => this.copied('copiedAddress')}>
                                <button className="btn btn-outline-primary" type="button">
                                  {this.state.copiedAddress ? 'Copied' : 'Copy'}
                                </button>
                              </CopyToClipboard>
                            </div>
                          </div>
                        </div>
                        <div className="px-3">
                          <div style={{marginBottom: '0.25rem'}}>Amount (XRB)</div>
                          <div className="input-group copyable-group">
                            <input type="text" className="form-control" value={amount_XRB} disabled={true} />
                            <div className="input-group-btn">
                              <CopyToClipboard text={amount_XRB} onCopy={() => this.copied('copiedAmount')}>
                                <button className="btn btn-outline-primary" type="button">
                                  {this.state.copiedAmount ? 'Copied' : 'Copy'}
                                </button>
                              </CopyToClipboard>
                            </div>
                          </div>
                        </div>

                          {
                            this.state.completed_at ?
                              <div className="p-3" style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'flex-end',
                                flex: 1
                              }}>
                                <button className="btn btn-success" style={{
                                  display: 'block',
                                  width: '100%',
                                  marginTop: '0.25rem'
                                }}>
                                 Payment Complete
                                </button>
                              </div>
                            : 
                            <div className="p-3" style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'flex-end',
                              flex: 1
                            }}>
                              <span style={{
                                fontSize: 12,
                                color: redDuration ? '#dc3545' : '#868e96',
                                textAlign: 'right'
                              }}>
                                Awaiting Payment {moment.duration(durationRemaining).minutes()} : {moment.duration(durationRemaining).seconds()}
                              </span>
                              <a
                                className="btn btn-primary"
                                href={`https://pay.raiwallet.com/?token=${this.state.token}`}
                                target="_blank"
                                style={{
                                marginTop: '0.25rem',
                                textDecoration: 'none'
                              }}>
                                Open in raiwallet
                              </a>
                            </div>
                          }
                      </div>
                    </div>
                  </div>
                </div>
              </Modal>
            : <div></div>
          }
          {
            this.state.completed_at ?
              <button className={`btn btn-success ${this.props.buttonClasses}`}>
                Payment Complete
              </button>
            :
            <button className={`btn btn-primary ${this.props.buttonClasses}`} onClick={() => this.purchase()}>
              {this.props.text}
            </button>
          }
        </div>
      </div>
    );
  }
}
