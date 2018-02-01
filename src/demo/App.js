import React from 'react';
import RaiCheckout from '../lib';

const App = () => (
  <div>
    <RaiCheckout
      onPaymentConfirmed={({ token, itemId }) => this.tryItNowTokenMethod({
        token, itemId
      })}
      amount={1}
      publicKey='public_7de3b4ac-6fb4-42bc-83d1-0e6c60c0011e'
      subTitle='Test Item Name'
      title='My Shop'
      itemId='test_item_id'
      text='Pay with NANO $0.01'
    />
  </div>
);

export default App;
