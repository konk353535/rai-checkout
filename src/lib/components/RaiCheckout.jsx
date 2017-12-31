import React, { Component } from "react";
import moment from 'moment';
import NumberFormat from 'react-number-format';
import Modal from 'react-modal';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import './RaiCheckout.css'

let checkInterval;
let timerInterval;

export default class RaiCheckout extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      accountToPay: '',
      durationPassed: null,
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
    console.log('purhcase method called!');
    // Init the purchase
    fetch('https://pays.eternitytower.net/methods/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([this.props.itemId, this.props.cost])
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

      console.log('starting pending purchase');
      this.pendingPurchase();

      timerInterval = setInterval(() => {
        this.updateSecondsPassed();
      }, 1000);
    }).catch((err) => {
      return this.setState({
        error: err
      })
    });
  }

  pendingPurchase() {
    fetch('https://pays.eternitytower.net/methods/waitForPendingPurchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([this.state.paymentId])
    }).then((resRaw) => {
      return resRaw.json();
    }).then((res) => {
      if (res) {
        // CLIENT should perform there custom logic here (pending payment)
        this.token({ paymentId: this.state.paymentId, itemId: this.props.itemId });
        checkInterval = setInterval(() => {
          this.checkPurchase();
        }, 1000);
      } else {
        console.log('then of res');
        setTimeout(() => {
          this.pendingPurchase();
        }, 5000);
      }
    }).catch((err) => {
      console.log('catch');
      setTimeout(() => {
        this.pendingPurchase();
      }, 5000);
    })
  }

  checkPurchase() {
    fetch('https://pays.eternitytower.net/methods/checkPurchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([this.state.paymentId])
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
      accountToPay: ''
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
                    <div className="px-3">
                      <div className="mb-1">Send (XRB)</div>
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
                    <div className="mt-3 px-3">
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
