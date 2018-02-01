# React Checkout component, for accepting Nano payments via ArrowPay

# Get started

1. `npm install arrowpay-react-checkout`
2. Import the component and styles

  ```
    import RaiCheckout from 'arrowpay-react-checkout';
    import 'arrowpay-react-checkout/build/css/index.css';
  ```

3. Use the component

  ```
  <RaiCheckout
    onPaymentConfirmed={({ token, item_id }) => this.tryItNowTokenMethod({
      token, item_id
    })}
    payment={{
      amount: 1,
      currency: 'USD'
    }}
    public_key='public_7de3b4ac-6fb4-42bc-83d1-0e6c60c0011e'
    sub_title='Test Item Name'
    title='My Shop'
    item_id='test_item_id'
    text='Pay with Nano $0.01'
  />
  ```
