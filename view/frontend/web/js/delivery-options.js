define(
  [
    'ko',
    'mage/url',
    'Magento_Customer/js/model/customer',
    'Magento_Checkout/js/model/quote',
    'Magento_Checkout/js/checkout-data',
    'Magento_Checkout/js/action/set-shipping-information',
    'MyParcelBE_Magento/js/vendor/myparcel',
    'domReady!',
  ],
  function(
    ko,
    mageUrl,
    customer,
    quote,
    checkoutData,
    setShippingInformationAction
  ) {
    'use strict';

    console.log({
      ko: ko,
      mageUrl: mageUrl,
      customer: customer,
      quote: quote,
      checkoutData: checkoutData,
      setShippingInformationAction: setShippingInformationAction,
    });

    /**
     * "Wait" until the postal code field is present before we initialize the rest of the code.
     *
     * @type {number}
     */
    var timer = setInterval(function() {
      if (MyParcelFrontend.getField('postcode')) {
        clearInterval(timer);
        MyParcelFrontend.init();
      }
    }, 300);

    var MyParcelFrontend = {
      splitStreetRegex: /(.*?)\s?(\d{1,4})[/\s-]{0,2}([A-z]\d{1,3}|-\d{1,4}|\d{2}\w{1,2}|[A-z][A-z\s]{0,3})?$/,

      // todo
      updateMagentoCheckoutEvent: 'update_checkout',

      updateDeliveryOptionsEvent: 'myparcel_update_delivery_options',
      updatedDeliveryOptionsEvent: 'myparcel_updated_delivery_options',
      updatedAddressEvent: 'myparcel_updated_address',

      /**
       * The selector of the field we use to get the delivery options data into the order.
       *
       * @type {String}
       */
      hiddenDataInput: '[name="myparcel_delivery_options"]',

      postcodeField: 'postcode',
      countryField: 'country_id',
      cityField: 'city',

      /**
       * Initialize the script.
       */
      init: function() {
        MyParcelFrontend.addListeners();
        MyParcelFrontend.hideShippingMethods();

        MyParcelFrontend.getMagentoSettings().onload = function() {
          if (this.status >= 200 && this.status < 400) {
            var response = JSON.parse(this.response);

            MyParcelFrontend.setConfig(response[0].data);
            MyParcelFrontend.updateAddress();
          }
        };

        // Event from the checkout
        document.addEventListener(this.updatedDeliveryOptionsEvent, MyParcelFrontend.onUpdatedDeliveryOptions);
      },

      /**
       * Add event listeners to Magento's address fields and update the address on change/.
       */
      addListeners: function() {
        var fields = [this.postcodeField, this.countryField, this.cityField];
        fields.forEach(function(field) {
          MyParcelFrontend.getField(field).addEventListener('change', MyParcelFrontend.updateAddress);
        });
      },

      /**
       * Set window.MyParcelConfig with the given config. Puts all the data in the correct properties.
       *
       * @param {Object} config - Response from the delivery_options request.
       */
      setConfig: function(config) {
        window.MyParcelConfig = config;
      },

      /**
       * Get field by name. Will return element with this selector: "#<billing|shipping>_<name>".
       *
       * @param {string} name - The part after `shipping/billing` in the id of an element in WooCommerce.
       *
       * @returns {Element}
       */
      getField: function(name) {
        return document.querySelector('[name=' + name + ']');
      },

      /**
       * Run the split street regex on the given full address to extract the house number and return it.
       *
       * @param {String} address - Full address.
       *
       * @returns {String|undefined} - The house number, if found. Otherwise null.
       */
      getHouseNumber: function(address) {
        var result = this.splitStreetRegex.exec(address);
        var numberIndex = 2;
        console.log('regex', address, result);
        return result ? result[numberIndex] : null;
      },

      /**
       * Trigger an event on the document body.
       *
       * @param {String} identifier - Name of the event.
       */
      triggerEvent: function(identifier) {
        var event = document.createEvent('HTMLEvents');
        event.initEvent(identifier, true, false);
        document.querySelector('body').dispatchEvent(event);
      },

      /**
       * Get data from form fields and put it in the global MyParcelConfig.
       */
      updateAddress: function(e) {
        var data = window.MyParcelConfig;

        data.address = {
          cc: MyParcelFrontend.getField(MyParcelFrontend.countryField).value,
          postalCode: MyParcelFrontend.getField(MyParcelFrontend.postcodeField).value,
          number: MyParcelFrontend.getHouseNumber(),
          city: MyParcelFrontend.getField(MyParcelFrontend.cityField).value,
        };

        window.MyParcelConfig = data;
        MyParcelFrontend.triggerEvent(MyParcelFrontend.updateDeliveryOptionsEvent);
      },

      /**
       * Get the address entered by the user depending on if they are logged in or not.
       *
       * @returns {Object}
       */
      getAddress: function() {
        var address;

        if (customer.isLoggedIn() &&
              typeof quote !== 'undefined' &&
              typeof quote.shippingAddress !== 'undefined' &&
              typeof quote.shippingAddress._latestValue !== 'undefined' &&
              typeof quote.shippingAddress._latestValue.street !== 'undefined' &&
              typeof quote.shippingAddress._latestValue.street[0] !== 'undefined'
        ) {
          address = this.getLoggedInAddress();
        } else {
          address = this.getNoLoggedInAddress();
        }

        var regExp = /[<>=]/g;

        var street = [
          address.street0,
          address.street1,
          address.street2,
        ].join(' ');

        var number = this.getHouseNumber(street);

        return {
          number: number,
          cc: address.country.replace(regExp, ''),
          postcode: address.postcode.replace(/[\s<>=]/g, ''),
          city: address.city.replace(regExp, ''),
        };
      },

      /**
       * Get the address for a logged in user.
       *
       * @returns {Object}
       */
      getLoggedInAddress: function() {
        var street0 = quote.shippingAddress._latestValue.street[0];
        var street1 = quote.shippingAddress._latestValue.street[1];
        var street2 = quote.shippingAddress._latestValue.street[2];
        var country = quote.shippingAddress._latestValue.countryId;
        var postcode = quote.shippingAddress._latestValue.postcode;
        var city = quote.shippingAddress._latestValue.postcode;

        return {
          street0: street0 ? street0 : '',
          street1: street1 ? street1 : '',
          street2: street2 ? street2 : '',
          country: country ? country : '',
          postcode: postcode ? postcode : '',
          city: city ? city : '',
        };
      },

      /**
       * Get the address assuming the user is not logged in.
       *
       * @returns {Object}
       */
      getNoLoggedInAddress: function() {
        var classPrefix = 'checkout.steps.shipping-step.shippingAddress.shipping-address-fieldset.';

        var street0 = registry.get(classPrefix + 'street.0');
        var street1 = registry.get(classPrefix + 'street.1');
        var street2 = registry.get(classPrefix + 'street.2');
        var country = registry.get(classPrefix + 'country_id');
        var postcode = registry.get(classPrefix + 'postcode');
        var city = registry.get(classPrefix + 'city');

        return {
          street0: street0 ? street0.get('value') : '',
          street1: street1 ? street1.get('value') : '',
          street2: street2 ? street2.get('value') : '',
          country: country ? country.get('value') : '',
          postcode: postcode ? postcode.get('value') : '',
          city: city ? city.get('value') : '',
        };
      },

      /**
       * Execute the delivery_options request to retrieve the settings object.
       *
       * @returns {XMLHttpRequest}
       */
      getMagentoSettings: function() {
        var url = mageUrl.build('rest/V1/delivery_options/get');

        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.send();

        return request;
      },

      /**
       * Triggered when the delivery options have been updated. Put the received data in the created data input.
       *
       * @param {CustomEvent} event - The event that was sent.
       */
      onUpdatedDeliveryOptions: function(event) {
        document.querySelector(MyParcelFrontend.hiddenDataInput).value = JSON.stringify(event.detail);
      },

      /**
       * Hide the shipping methods.
       */
      hideShippingMethods: function () {

      }
    };
  }
);
