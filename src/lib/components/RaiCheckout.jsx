import React, { Component } from "react";
import moment from 'moment';
import NumberFormat from 'react-number-format';
import Modal from 'react-modal';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import './RaiCheckout.css'

let checkInterval;
let timerInterval;

const dev = false;
let BASE_URL = 'https://arrowpay.io';
/*
if (dev) {
  BASE_URL = 'http://localhost:3001'
}*/

export default class RaiCheckout extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      accountToPay: '',
      durationPassed: null,
      publicKey: '',
      error: '',
      copiedAmount: false,
      copiedAddress: false,
      amountXRB: null,
      amountUSD: null,
      paymentId: null,
      completed: false,
      completedAt: null
    }
  }

  token({ paymentId, itemId }) {
    this.props.token({ paymentId, itemId });
  }

  purchase() {
    // Init the purchase
    fetch(`${BASE_URL}/api/payment/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        publicKey: this.props.publicKey,
        itemId: this.props.itemId,
        cost: this.props.cost
      })
    }).then((resRaw) => {
      return resRaw.json();
    }).then((res) => {

      this.setState({
        accountToPay: res.accountToPay,
        startedAt: moment().toDate(),
        amountXRB: res.amountXRB,
        amountUSD: res.amountUSD,
        paymentId: res.paymentId,
        completed: false,
        completedAt: null
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
    if (this.state.accountToPay) {
      fetch(`${BASE_URL}/api/payment/await`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ paymentId: this.state.paymentId })
      }).then((resRaw) => {
        return resRaw.json();
      }).then((res) => {
        if (res) {
          // CLIENT should perform there custom logic here (pending payment)
          this.token({ paymentId: this.state.paymentId, itemId: this.props.itemId });
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
      body: JSON.stringify({ paymentId: this.state.paymentId })
    }).then((resRaw) => {
      return resRaw.json();
    }).then((res) => {
      if (res.completedAt) {
        clearInterval(checkInterval);
        clearInterval(timerInterval);
        this.setState({
          completedAt: res.completedAt,
          completed: true
        });

        setTimeout(() => {
          this.setState({
            accountToPay: '',
            amountXRB: null
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
    const durationPassed = moment.duration(moment().diff(this.state.startedAt));

    if (durationPassed > 10 * 60 * 1000) {
      return this.closeModal();
    }

    this.setState({
      durationPassed
    })
  }

  closeModal() {
    this.setState({
      accountToPay: '',
      paymentId: null
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
    const accountToPay = this.state.accountToPay;
    const amountXRB = this.state.amountXRB;
    const amountUSD = (this.state.amountUSD / 100).toFixed(2);
    const durationPassed = this.state.durationPassed;
    const redDuration = durationPassed > 5 * 60 * 1000;
    const durationRemaining = (10 * 60 * 1000) - durationPassed;
    const classes = this.props.classes;

    return (
      <div>
        <div>
          {
            accountToPay ?
              <Modal
                isOpen={true}
                contentLabel="Modal"
              >
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative'
                }}>
                  <div className="bg-primary px-3" style={{
                    display: 'flex',
                    paddingTop: '0.5rem',
                    paddingBottom: '0.5rem'
                  }}>
                    <div style={{color: '#FFF', display: 'flex', alignItems: 'center'}}>
                      <img src="./arrowLogoWhite.png" style={{marginRight: '0.25rem'}} height={18} />
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
                          <div>{this.props.subTitle}</div>
                        </div>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          flex: 1
                        }}>
                          <div>Total</div>
                          <div>${amountUSD} USD</div>
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
                            <input type="text" className="form-control" value={accountToPay} disabled={true} />
                            <div className="input-group-btn">
                              <CopyToClipboard text={accountToPay} onCopy={() => this.copied('copiedAddress')}>
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
                            <input type="text" className="form-control" value={amountXRB} disabled={true} />
                            <div className="input-group-btn">
                              <CopyToClipboard text={amountXRB} onCopy={() => this.copied('copiedAmount')}>
                                <button className="btn btn-outline-primary" type="button">
                                  {this.state.copiedAmount ? 'Copied' : 'Copy'}
                                </button>
                              </CopyToClipboard>
                            </div>
                          </div>
                        </div>

                          {
                            this.state.completedAt ?
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
                              <button className="btn btn-primary" style={{
                                display: 'block',
                                width: '100%',
                                marginTop: '0.25rem'
                              }}>
                                Open in wallet
                              </button>
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
            this.state.completedAt ?
              <button className='btn btn-success'>
                Payment Complete
              </button>
            :
            <button className='btn btn-primary' onClick={() => this.purchase()}>
              {this.props.text}
            </button>
          }
        </div>
      </div>
    );
  }
}
