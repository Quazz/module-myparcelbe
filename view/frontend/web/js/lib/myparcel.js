define(
    [
        'jquery'
    ],
    function($) {
        txtWeekDays = [
            'Zondag',
            'Maandag',
            'Dinsdag',
            'Woensdag',
            'Donderdag',
            'Vrijdag',
            'Zaterdag'
        ];

        translateENtoNL = {
            'monday': 'maandag',
            'tuesday': 'dindsag',
            'wednesday': 'woensdag',
            'thursday': 'donderdag',
            'friday': 'vrijdag',
            'saturday': 'zaterdag',
            'sunday': 'zondag'
        };

        return MyParcel = {

            /*
             * Init
             *
             * Initialize the MyParcel checkout.
             *
             */

            init: function (data) {
                MyParcel.myParcelConfig = data;

                /* Prices */
                $('#mypa-price-bpost-signature').html(' (+ € ' + MyParcel.myParcelConfig.priceBpostAutograph + ')');
                $('#mypa-delivery-bpost-saturday-price').html(' (+ € ' + MyParcel.myParcelConfig.priceBpostSaturdayDelivery + ')');
                if (parseFloat(MyParcel.myParcelConfig.pricePickup) > 0) {
                    $('#mypa-price-pickup').html(' (+ € ' + MyParcel.myParcelConfig.pricePickup + ')');
                }
                /* Call delivery options */
                MyParcel.callDeliveryOptions();

                /* Engage defaults */
                MyParcel.hideBpostSaturday();
                MyParcel.hideDelivery();
                $('#method-myparcel-flatrate').click();

                MyParcel.hideBpostSignature();
                if (MyParcel.myParcelConfig.allowBpostAutograph) {
                    MyParcel.showBpostSignature();
                }

            },

            /*
             * Bind
             *
             * Bind actions to selectors.
             *
             */

            bind: function () {
                $('#mypa-submit').on('click', function (e) {
                    e.preventDefault();
                    MyParcel.exportDeliveryOptionToWebshop();
                });

                $('#mypa-signature-selector').on('change', function (e) {
                    MyParcel.toggleDeliveryOptions();
                });

                $('#mypa-recipient-only-selector').on('change', function () {
                    MyParcel.toggleDeliveryOptions();
                });

                $('#mypa-deliver-pickup-deliver').on('click', function () {
                    MyParcel.showDelivery();
                });

                $('#mypa-deliver-pickup-deliver-bpost-saturday').on('click', function () {
                    MyParcel.showDelivery();
                });

                $('#mypa-deliver-pickup-pickup').on('click', function () {
                    MyParcel.hideDelivery();
                });

                $('#mypa-show-location-details').on('click', function () {
                    MyParcel.showLocationDetails();
                });

                $('.mypa-help').on('click', function (e) {
                    e.preventDefault();
                    MyParcel.showHelp(e);
                });

                $('#mypa-location-details').on('click', function () {
                    MyParcel.hideLocationDetails();
                });

                $('#mypa-pickup-location').on('change', function () {
                    $('#mypa-deliver-pickup-pickup').click();
                });

                /* External webshop triggers */
                $('#mypa-delivery-options-container').on('click', function () {

                    $('#mypa-signed').prop('checked', false);

                    /**
                     * Signature
                     */
                    if (
                        $('input[name="mypa-deliver-or-pickup"]:checked').val() == 'mypa-deliver' &&
                        $('#mypa-method-signature-selector-be').prop('checked')
                    ) {
                        $('input[value="' + MyParcel.myParcelConfig.parent_carrier + '_signature"]').click();

                        $('#mypa-signed').prop('checked', true);
                        MyParcel.addDeliveryToMagentoInput();
                        return;
                    }

                    /**
                     * Saturday signature
                     */
                    if (
                        $('#mypa-deliver-pickup-deliver-bpost-saturday').prop('checked') &&
                        $('#mypa-method-signature-selector-be').prop('checked')
                    ) {
                        $('input[value="' + MyParcel.myParcelConfig.parent_carrier + '_saturday_signature"]').click();

                        $('#mypa-signed').prop('checked', true);
                        MyParcel.addDeliveryToMagentoInput();
                        return;
                    }

                    /**
                     * Saturday
                     */
                    if (
                        $('#mypa-deliver-pickup-deliver-bpost-saturday').prop('checked') &&
                        $('#mypa-method-signature-selector-be').prop('checked') === false
                    ) {
                        $('input[value="' + MyParcel.myParcelConfig.parent_carrier + '_saturday"]').click();
                        MyParcel.addDeliveryToMagentoInput();
                        return;
                    }

                    /**
                     * Pickup
                     */
                    if ($('#mypa-deliver-pickup-pickup').prop('checked')) {
                        $('input[value="' + MyParcel.myParcelConfig.parent_carrier + '_pickup"]').click();
                        MyParcel.addPickupToMagentoInput();
                        return;
                    }

                    /**
                     * Normal
                     */
                    $('input[value="' + MyParcel.myParcelConfig.parent_carrier + '_' + MyParcel.myParcelConfig.parent_method + '"]').click();
                    MyParcel.addDeliveryToMagentoInput();
                    return;
                });
            },

            addPickupToMagentoInput: function () {
                var locationId = $('#mypa-pickup-location').val();
                var currentLocation = MyParcel.getPickupByLocationId(MyParcel.storeDeliveryOptions.data.pickup, locationId);
                /* @todo remove this if the API gives retail */
                currentLocation.price_comment = 'retail';
                $("input[name='delivery_options']").val(JSON.stringify(currentLocation));
            },

            addDeliveryToMagentoInput: function () {
                var currentLocation = MyParcel.storeDeliveryOptions.data.delivery[0];
                $("input[name='delivery_options']").val(JSON.stringify(currentLocation));
            },
            /*
             * getPickupByLocationId
             *
             * Find the location by id and return the object.
             *
             */
            getPickupByLocationId: function (obj, locationId) {
                var object;

                $.each(obj, function (key, info) {
                    if (info.location_code === locationId) {
                        object = info;
                        return false;
                    }
                    ;
                });

                return object;
            },

            /*
             * toggleDeliveryOptions
             *
             * Shows and hides the display options that are valid for the recipient only and signature required pre-selectors
             *
             */

            toggleDeliveryOptions: function () {
                var recipientOnly = $('#mypa-recipient-only-selector').is(':checked');
                var signatureRequired = $('#mypa-signature-selector').is(':checked');

                hideAllDeliveryOptions();
                if (recipientOnly && signatureRequired) {
                    $('.method-myparcel-delivery-signature-and-only-recipient-fee-div').show();
                    $('#method-myparcel-delivery-signature-and-only-recipient-fee').click();
                }

                else if (recipientOnly && !signatureRequired) {
                    $('.method-myparcel-delivery-only-recipient-div').show();
                    $('#method-myparcel-delivery-only-recipient').click();
                }

                else if (!recipientOnly && signatureRequired) {
                    $('.method-myparcel-delivery-signature-div').show();
                    $('.method-myparcel-delivery-evening-signature-div').show();
                    $('.method-myparcel-morning-signature-div').show();
                    $('#method-myparcel-delivery-signature').click();
                }

                /* No pre selection, show everything. */
                else {
                    MyParcel.showAllDeliveryOptions();
                    $('#method-myparcel-flatrate').click();
                }
            },


            /*
             * exportDeliverOptionToWebshop
             *
             * Exports the selected deliveryoption to the webshop.
             *
             */

            exportDeliveryOptionToWebshop: function () {
                var deliveryOption = "";
                var selected = $("#mypa-delivery-option-form").find("input[type='radio']:checked");
                if (selected.length > 0) {
                    deliveryOption = selected.val();
                }

                /* XXX Send to appropriate webshop field */
            },

            /*
             * showHelp
             *
             * Shows all help for MyParcel option.
             *
             */

            showHelp: function (e) {
                alert('haelp!');
            },

            /*
             * hideMessage
             *
             * Hides pop-up message.
             *
             */

            hideMessage: function () {
                $('#mypa-message').hide();
                $('#mypa-message').html(' ');
            },

            /*
             * hideMessage
             *
             * Hides pop-up essage.
             *
             */

            showMessage: function (message) {
                $('#mypa-message').html(message);
                $('#mypa-message').show();
            },

            /*
             * hideDelivery
             *
             * Hides interface part for delivery.
             *
             */

            hideDelivery: function () {
                $('#mypa-pre-selectors-nl').hide();
                $('#mypa-delivery-selectors-nl').hide();
                $('#mypa-delivery-selectors-be').hide();
            },

            /*
             * showDelivery
             *
             * Shows interface part for delivery.
             *
             */

            showDelivery: function () {
                $('#mypa-pre-selectors-' + MyParcel.myParcelConfig.countryCode.toLowerCase()).show();
                $('#mypa-delivery-selectors-' + MyParcel.myParcelConfig.countryCode.toLowerCase()).show();

                MyParcel.hideBpostSignature();
                if (MyParcel.myParcelConfig.allowBpostAutograph) {
                    MyParcel.showBpostSignature();
                }
            },

            /*
             * hideAllDeliveryOptions
             *
             * Hides all available MyParcel delivery options.
             *
             */

            hideAllDeliveryOptions: function () {
                $('.mypa-delivery-option').hide();
                $('#mypa-delivery-selectors-be').hide();
            },

            /*
             * showAllDeliveryOptions
             *
             * Shows all available MyParcel delivery options.
             *
             */

            showAllDeliveryOptions: function () {
                $('.mypa-delivery-option').show();
            },

            /*
             * showSpinner
             *
             * Shows the MyParcel spinner.
             *
             */

            showSpinner: function () {
                $('#mypa-spinner').show();
            },


            /*
             * hideSpinner
             *
             * Hides the MyParcel spinner.
             *
             */

            hideSpinner: function () {
                $('#mypa-spinner').hide();
            },

            showPostNlSignatureAndRecipientOnly: function () {
                $('#mypa-postnl-signature-recipient-only').show();
            },

            hidePostNlSignatureAndRecipientOnly: function () {
                $('#mypa-postnl-signature-recipient-only').hide();
            },

            showPostNlRecipientOnly: function () {
                $('#mypa-postnl-recipient-only').show();
            },

            hidePostNlRecipientOnly: function () {
                $('#mypa-postnl-recipient-only').hide();
            },

            showPostNlSignature: function () {
                $('#mypa-postnl-signature').show();
            },

            hidePostNlSignature: function () {
                $('#mypa-postnl-signature').hide();
            },

            showPostNlRecpientOnly: function () {
                $('#mypa-postnl-recipient-only').show();
            },

            hidePostNlRecpientOnly: function () {
                $('#mypa-postnl-recipient-only').hide();
            },

            showPostNlSignature: function () {
                $('#mypa-postnl-signature').show();
            },

            hidePostNlSignature: function () {
                $('#mypa-postnl-signature').hide();
            },

            showBpostSignature: function () {
                $('#mypa-delivery-selectors-be').show();
            },

            hideBpostSignature: function () {
                $('#mypa-delivery-selectors-be').hide();
            },

            /*
             * showBpostSaturday
             *
             * Show Bpost saturday delivery for extra fee.
             *
             */

            showBpostSaturday: function (date) {
                if (MyParcel.myParcelConfig.allowBpostSaturdayDelivery) {
                    $('#mypa-delivery-date-bpost-saturday').val(date);
                    $('#mypa-delivery-bpost-saturday-price').html(' (+ € ' + MyParcel.myParcelConfig.priceBpostSaturdayDelivery + ')');
                    $('#mypa-bpost-saturday-delivery').show();
                }
            },

            /*
             * hideBpostSaturday
             *
             * Hide Bpost saturday delivery.
             *
             */

            hideBpostSaturday: function () {
                $('#mypa-bpost-saturday-delivery').hide();
                $('#mypa-delivery-date-bpost-saturday').val(' ');
                $('#mypa-delivery-bpost-saturday-price').html(' (+ € ' + MyParcel.myParcelConfig.priceBpostSaturdayDelivery + ')');
            },

            /*
             * dateToObject
             *
             * Convert api date string format to object
             *
             */

            dateToObject: function (apiDate) {
                var deliveryDate = apiDate;
                var dateArr = deliveryDate.split('-');
                return new Date(dateArr[0], dateArr[1] - 1, dateArr[2]);
            },

            /*
             * dateToString
             *
             * Convert api date string format to human readable string format
             *
             */

            dateToString: function (apiDate) {
                var deliveryDate = apiDate;
                var dateArr = deliveryDate.split('-');
                var dateObj = new Date(dateArr[0], dateArr[1] - 1, dateArr[2]);
                var month = dateObj.getMonth();
                month++;
                return txtWeekDays[dateObj.getDay()] + " " + dateObj.getDate() + "-" + month + "-" + dateObj.getFullYear();
            },

            /*
             * showDeliveryDates
             *
             * Show possible delivery dates.
             *
             */

            showDeliveryDates: function (deliveryOptions) {
                var dateString = MyParcel.dateToString(deliveryOptions.data.delivery[0].date);
                var dateObj = MyParcel.dateToObject(deliveryOptions.data.delivery[0].date);

                /* If there is a costly bPost saturday delivery also present the next option
                   that has the standard fee */
                if (dateObj.getDay() == 6 && MyParcel.myParcelConfig.carrierCode == 2) {
                    MyParcel.showBpostSaturday(dateString);
                    if (typeof deliveryOptions.data.delivery[1] !== 'undefined') {
                        dateString = MyParcel.dateToString(deliveryOptions.data.delivery[1].date);
                    }
                }

                /* All other deliveries */
                $('#mypa-delivery-date').val(dateString);
            },

            /*
             * clearPickupLocations
             *
             * Clear pickup locations and show a non-value option.
             *
             */

            clearPickUpLocations: function () {
                var html = '<option value="">---</option>';
                $('#mypa-pickup-location').html(html);
            },


            /*
             * hidePickupLocations
             *
             * Hide the pickup location option.
             *
             */

            hidePickUpLocations: function () {
                $('#mypa-pickup-location-selector').hide();
                $('.mel-style').css('border-bottom', '0');
            },


            /*
             * showPickupLocations
             *
             * Shows possible pickup locations, from closest to furdest.
             *
             */

            showPickUpLocations: function (deliveryOptions) {
                var html = "";
                $.each(deliveryOptions.data.pickup, function (key, value) {
                    var distance = parseFloat(Math.round(value.distance)/1000).toFixed(2) + ' KM';
                    html += '<option value="' + value.location_code + '">' + value.location + ', ' + value.street + ' ' + value.number + ", " + value.city + " (" + distance + ") </option>\n";
                });
                $('#mypa-pickup-location').html(html);
                $('#mypa-pickup-location-selector').show();
            },

            /*
             * hideLocationDetails
             *
             * Hide the detailed information pop-up for selected location.
             *
             */

            hideLocationDetails: function () {
                $('#mypa-location-details').hide();
            },

            /*
             * showLocationDetails
             *
             * Shows the detailed information pop-up for the selected pick-up location.
             */

            showLocationDetails: function () {
                var locationId = $('#mypa-pickup-location').val();
                var currentLocation = MyParcel.getPickupByLocationId(MyParcel.storeDeliveryOptions.data.pickup, locationId);
                var startTime = currentLocation.start_time;

                /* Strip seconds if present */
                if (startTime.length > 5) {
                    startTime = startTime.slice(0, -3);
                }

                var html = '<span class="mypa-close">Sluiten</span>';
                html += '<span class="mypa-pickup-location-details-location"><h3>' + currentLocation.location + '</h3></span>'
                html += '<span class="mypa-pickup-location-details-street">' + currentLocation.street + '&nbsp;' + currentLocation.number + '</span>';
                html += '<span class="mypa-pickup-location-details-city">' + currentLocation.postal_code + '&nbsp;' + currentLocation.city + '</span>';
                if (currentLocation.phone_number) {
                    html += '<span class="mypa-pickup-location-details-phone">&nbsp;' + currentLocation.phone_number + '</span>'
                }
                html += '<span class="mypa-pickup-location-details-time">Ophalen vanaf:&nbsp;' + startTime + '</span>'
                html += '<h3>Openingstijden</h3>';
                $.each(
                    currentLocation.opening_hours, function (weekday, value) {
                        html += '<span class="mypa-pickup-location-details-day">' + translateENtoNL[weekday] + "</span> ";
                        $.each(value, function (key2, times) {
                            html += '<span class="mypa-time">' + times + "</span>";
                        });
                        html += "<br>";
                    });
                $('#mypa-location-details').html(html).show();
            },

            /*
             * retryPostalcodeHouseNumber
             *
             * After detecting an unrecognised postcal code / house number combination the user can try again.
             * This function copies the newly entered data back into the webshop forms.
             *
             */

            retryPostalcodeHouseNumber: function () {
                MyParcel.myParcelConfig.postal_code = $('#mypa-error-postcode').val();
                MyParcel.myParcelConfig.number = $('#mypa-error-number').val();
                MyParcel.hideMessage();
                MyParcel.callDeliveryOptions();
                $('#mypa-deliver-pickup-deliver').click();
            },

            /*
             * showFallBackDelivery
             *
             * If the API call fails and we have no data about delivery or pick up options
             * show the customer an "As soon as possible" option.
             */

            showFallBackDelivery: function () {
                MyParcel.hidePickUpLocations();
                $('#mypa-delivery-date').val('Zo snel mogelijk.');
                $('#mypa-deliver-pickup-deliver').click();
            },


            /*
             * showRetru
             *
             * If a customer enters an unrecognised postal code housenumber combination show a
             * pop-up so they can try again.
             */

            showRetry: function () {
                MyParcel.showMessage(
                    '<h3>Huisnummer/postcode combinatie onbekend</h3>' +
                    '<div class="full-width mypa-error">' +
                    '<label for="mypa-error-postcode">Postcode</label>' +
                    '<input type="text" name="mypa-error-postcode" id="mypa-error-postcode" value="' + MyParcel.myParcelConfig.postal_code + '">' +
                    '</div><div class="full-width mypa-error">' +
                    '<label for="mypa-error-number">Huisnummer</label>' +
                    '<input type="text" name="mypa-error-number" id="mypa-error-number" value="' + MyParcel.myParcelConfig.number + '">' +
                    '<br><a href="#" id="mypa-error-try-again">Opnieuw</a>' +
                    '</div>'
                );

                /* remove trigger that closes message */
                $('#mypa-message').off('click');

                /* bind trigger to new button */
                $('#mypa-error-try-again').on('click', function () {
                    MyParcel.retryPostalcodeHouseNumber();
                });
            },


            /*
             * callDeliveryOptions
             *
             * Calls the MyParcel API to retrieve the pickup and delivery options for given house number and
             * Postal Code.
             *
             */

            callDeliveryOptions: function () {
                MyParcel.showSpinner();
                MyParcel.clearPickUpLocations();

                /* Don't call API unless both PC and House Number are set */
                if (!MyParcel.myParcelConfig.number || !MyParcel.myParcelConfig.postal_code) {
                    MyParcel.hideSpinner();
                    MyParcel.showFallBackDelivery();
                    return;
                }

                /* add streetName for Belgium */
                $.get(MyParcel.myParcelConfig.apiBaseUrl + "delivery_options",
                    {
                        carrier: MyParcel.myParcelConfig.carrierCode,
                        postal_code: MyParcel.myParcelConfig.postal_code,
                        cc: MyParcel.myParcelConfig.countryCode,
                        street: MyParcel.myParcelConfig.street,
                        number: MyParcel.myParcelConfig.number,
                        city: MyParcel.myParcelConfig.city,
                        saturday_delivery: MyParcel.myParcelConfig.allowBpostSaturdayDelivery,
                        cutofff_time: MyParcel.myParcelConfig.cutoffTime,
                        dropoff_days: MyParcel.myParcelConfig.dropOffDays,
                        dropoff_delay: MyParcel.myParcelConfig.dropOffDelay,
                        exclude_delivery_type: MyParcel.myParcelConfig.excludeDeliveryType
                    })
                    .done(function (data) {

                        if (data.errors) {
                            $.each(data.errors, function (key, value) {
                                /* Postalcode housenumber combination not found or not recognised. */
                                if (value.code == '3212' || value.code == '3505') {
                                    MyParcel.showRetry();
                                }

                                /* Any other error */
                                else {
                                    MyParcel.showFallBackDelivery();
                                }
                            });
                        }

                        /* No errors */
                        else {
                            MyParcel.showPickUpLocations(data);
                            MyParcel.showDeliveryDates(data);
                            MyParcel.storeDeliveryOptions = data;
                            $('#mypa-deliver-pickup-deliver').click();
                        }
                    })
                    .fail(function () {
                        MyParcel.showFallBackDelivery();
                    })
                    .always(function () {
                        MyParcel.hideSpinner();
                    });
            }
        }
    }
);