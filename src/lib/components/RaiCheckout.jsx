import React, { Component } from "react";
import moment from 'moment';
import NumberFormat from 'react-number-format';
import Modal from 'react-modal';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import './RaiCheckout.css'

let checkInterval;
let timerInterval;

const dev = false;
let BASE_URL = 'https://pays.eternitytower.net';
if (dev) {
  BASE_URL = 'http://localhost:3001'
}

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
    const durationPassed = this.state.durationPassed;

    return (
      <div>
        <div>
          {
            accountToPay ?
              <Modal
                isOpen={true}
                contentLabel="Modal"
              >
                <div className="d-flex flex-column" style={{ flex: 1, position: 'relative' }}>
                  <button
                    type="button"
                    className="close float-right"
                    data-dismiss="modal"
                    aria-label="Close"
                    style={{position: 'absolute', right: 10, top: 5}}
                    onClick={() => this.closeModal()}
                  >
                    <span aria-hidden="true">&times;</span>
                  </button>
                  <div
                    className="d-flex flex-column justify-content-center align-items-center p-3 mb-3"
                    style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid #DFDFDF' }}>
                    <h4>{this.props.title}</h4>
                    <div>{this.props.subTitle}</div>
                  </div>
                  <div className="d-flex flex-column" style={{ flex: 1 }}>
                    <div className="px-3 mb-3">
                      <div className="mb-1">To</div>
                      <div className="input-group">
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
                      <div className="mb-1">Amount (XRB)</div>
                      <div className="input-group">
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
                  </div>
                  <hr className="mb-0" style={{ width: '100%' }}></hr>
                  <div className="d-flex flex-column justify-content-end p-3">
                    {
                      this.state.completed ? <div className="btn btn-success btn-md">
                        Payment complete
                      </div>
                      : <div className="btn btn-secondary btn-md">
                        Awaiting Payment... {moment.duration(durationPassed).minutes()} : {moment.duration(durationPassed).seconds()}
                      </div>                 
                    }
                  </div>
                </div>
              </Modal>
            :
            <button className="btn btn-primary" onClick={() => this.purchase()}>
              {this.props.text}
            </button>
          }
        </div>
      </div>
    );
  }
}
