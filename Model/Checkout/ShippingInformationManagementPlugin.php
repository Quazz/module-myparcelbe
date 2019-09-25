<?php

namespace MyParcelBE\Magento\Model\Checkout;

class ShippingInformationManagementPlugin
{

    protected $quoteRepository;

    public function __construct(
        \Magento\Quote\Model\QuoteRepository $quoteRepository
    ) {
        $this->quoteRepository = $quoteRepository;
    }

    /**
     * @param \Magento\Checkout\Model\ShippingInformationManagement $subject
     * @param $cartId
     * @param \Magento\Checkout\Api\Data\ShippingInformationInterface $addressInformation
     */
    public function beforeSaveAddressInformation(
        \Magento\Checkout\Model\ShippingInformationManagement $subject,
        $cartId,
        \Magento\Checkout\Api\Data\ShippingInformationInterface $addressInformation
    ) {
        $extAttributes = $addressInformation->getExtensionAttributes();
        // @todo check delivery options from field (step 1)
        if (! empty($extAttributes) &&
            ! empty($extAttributes->getDeliveryOptions()) &&
            $extAttributes->getDeliveryOptions() != '{}'
        ) {
            $deliveryOptions = $extAttributes->getDeliveryOptions();
            $quote = $this->quoteRepository->getActive($cartId);
            $quote->setDeliveryOptions($deliveryOptions);
        }
    }
}
