<?php
/**
 * LICENSE: This source file is subject to the Creative Commons License.
 * It is available through the world-wide-web at this URL:
 * http://creativecommons.org/licenses/by-nc-nd/3.0/nl/deed.en_US
 *
 * If you want to add improvements, please create a fork in our GitHub:
 * https://github.com/myparcelbe
 *
 * @author      Reindert Vetter <info@sendmyparcel.be>
 * @copyright   2010-2016 MyParcel
 * @license     http://creativecommons.org/licenses/by-nc-nd/3.0/nl/deed.en_US  CC BY-NC-ND 3.0 NL
 * @link        https://github.com/myparcelbe/magento
 * @since       File available since Release v0.1.0
 */

namespace MyParcelBE\Magento\Helper;

use Magento\Checkout\Model\Session;
use Magento\Framework\App\Helper\Context;
use Magento\Framework\Module\ModuleListInterface;
use Magento\Quote\Api\Data\EstimateAddressInterfaceFactory;
use Magento\Quote\Model\ShippingMethodManagement;
use MyParcelBE\Magento\Model\Rate\Result;
use MyParcelNL\Sdk\src\Services\CheckApiKeyService;

class Checkout extends Data
{
    public const FIELD_DROP_OFF_DAY     = 'drop_off_day';
    public const FIELD_MYPARCEL_CARRIER = 'myparcel_carrier';
    public const FIELD_DELIVERY_OPTIONS = 'myparcel_delivery_options';
    public const FIELD_TRACK_STATUS     = 'track_status';
    public const DEFAULT_COUNTRY_CODE   = 'BE';

    private $base_price = 0;

    /**
     * @var ShippingMethodManagement
     */
    private $shippingMethodManagement;
    /**
     * @var EstimateAddressInterfaceFactory
     */
    private $estimatedAddressFactory;

    /**
     * @var \Magento\Quote\Model\Quote
     */
    private $quote;

    /**
     * @param Context                         $context
     * @param ModuleListInterface             $moduleList
     * @param EstimateAddressInterfaceFactory $estimatedAddressFactory
     * @param ShippingMethodManagement        $shippingMethodManagement
     * @param CheckApiKeyService              $checkApiKeyService
     * @param Session                         $session
     *
     * @throws \Magento\Framework\Exception\LocalizedException
     * @throws \Magento\Framework\Exception\NoSuchEntityException
     */
    public function __construct(
        Context $context,
        ModuleListInterface $moduleList,
        EstimateAddressInterfaceFactory $estimatedAddressFactory,
        ShippingMethodManagement $shippingMethodManagement,
        CheckApiKeyService $checkApiKeyService,
        Session $session
    ) {
        parent::__construct($context, $moduleList, $checkApiKeyService);
        $this->shippingMethodManagement = $shippingMethodManagement;
        $this->estimatedAddressFactory  = $estimatedAddressFactory;
        $this->quote                    = $session->getQuote();
    }

    /**
     * @return float
     */
    public function getBasePrice()
    {
        return $this->base_price;
    }

    /**
     * @param float $base_price
     */
    public function setBasePrice($base_price)
    {
        $this->base_price = $base_price;
    }

    /**
     * Set shipping base price
     *
     * @param \Magento\Quote\Model\Quote $quoteId
     *
     * @return Checkout
     */
    public function setBasePriceFromQuote($quoteId)
    {
        $price = $this->getParentRatePriceFromQuote($quoteId);
        $this->setBasePrice((double) $price);

        return $this;
    }

    /**
     * @param \Magento\Quote\Model\Quote $quoteId
     *
     * @return string
     */
    public function getParentRatePriceFromQuote($quoteId)
    {
        $method = $this->getParentRateFromQuote($quoteId);
        if ($method === null) {
            return null;
        }

        return $method->getPriceInclTax();
    }

    /**
     * @param \Magento\Quote\Model\Quote $quoteId
     *
     * @return string
     */
    public function getParentMethodNameFromQuote($quoteId)
    {
        $method = $this->getParentRateFromQuote($quoteId);
        if ($method === null) {
            return null;
        }

        return $method->getMethodCode();
    }

    /**
     * @param \Magento\Quote\Model\Quote $quoteId
     *
     * @return string
     */
    public function getParentCarrierNameFromQuote($quoteId)
    {
        $method = $this->getParentRateFromQuote($quoteId);
        if ($method === null) {
            return null;
        }

        return $method->getCarrierCode();
    }

    /**
     * @param \Magento\Quote\Model\Quote $quoteId
     *
     * @return \Magento\Quote\Model\Cart\ShippingMethod $methods
     */
    public function getParentRateFromQuote($quoteId)
    {
        if ($quoteId == null) {
            return null;
        }
        $parentCarriers   = explode(',', $this->getGeneralConfig('shipping_methods/methods'));
        $addressFromQuote = $this->quote->getShippingAddress();
        /**
         * @var \Magento\Quote\Api\Data\EstimateAddressInterface $estimatedAddress
         * @var \Magento\Quote\Model\Cart\ShippingMethod[]       $methods
         */
        $estimatedAddress = $this->estimatedAddressFactory->create();
        $estimatedAddress->setCountryId($addressFromQuote->getCountryId() ?? self::DEFAULT_COUNTRY_CODE);
        $estimatedAddress->setPostcode($addressFromQuote->getPostcode() ?? '');
        $estimatedAddress->setRegion($addressFromQuote->getRegion() ?? '');
        $estimatedAddress->setRegionId($addressFromQuote->getRegionId() ?? '');
        $magentoMethods  = $this->shippingMethodManagement->estimateByAddress($quoteId, $estimatedAddress);
        $myParcelMethods = array_keys(Result::getMethods());

        foreach ($magentoMethods as $method) {

            $methodCode       = explode("/", $method->getMethodCode());
            $latestMethodCode = array_pop($methodCode);

            if (
                in_array($method->getCarrierCode(), $parentCarriers) &&
                ! in_array($latestMethodCode, $myParcelMethods)
            ) {
                return $method;
            }
        }

        return null;
    }

    /**
     * Get MyParcel method/option price.
     *
     * Check if total shipping price is not below 0 euro
     *
     * @param        $carrier
     * @param string $key
     * @param bool   $addBasePrice
     *
     * @return float
     */
    public function getMethodPrice($carrier, $key, $addBasePrice = true)
    {
        $value = $this->getCarrierConfig($key, $carrier);

        if ($addBasePrice) {
            // Calculate value
            $value = $this->getBasePrice() + $value;
        }

        return (float) $value;
    }

    /**
     * Get shipping price
     *
     * @param $price
     * @param $flag
     *
     * @return mixed
     */
    /*private function getShippingPrice($price, $flag = false)
    {
        $flag = $flag ? true : Mage::helper('tax')->displayShippingPriceIncludingTax();
        return (float)Mage::helper('tax')->getShippingPrice($price, $flag, $quoteId->getShippingAddress());
    }*/

    /**
     * Get checkout setting
     *
     * @param string $carrier
     * @param string $code
     * @param bool   $canBeNull
     *
     * @return mixed
     */
    public function getCarrierConfig($code, $carrier = null, $canBeNull = false)
    {
        $value = $this->getConfigValue($carrier . $code);
        if (null != $value || $canBeNull) {
            return $value;
        }

        $this->_logger->critical('Can\'t get setting with path:' . $carrier . $code);
    }

    /**
     * Get bool of setting
     *
     * @param string $carrier
     * @param string $key
     *
     * @return bool
     */
    public function getBoolConfig($carrier, $key)
    {
        return $this->getCarrierConfig($key, $carrier) == "1" ? true : false;
    }

    /**
     * Get time for delivery endpoint
     *
     * @param        $carrier
     * @param string $key
     *
     * @return string
     */
    public function getTimeConfig($carrier, $key)
    {
        $timeAsString   = str_replace(',', ':', $this->getCarrierConfig($key, $carrier));
        $timeComponents = explode(':', $timeAsString);
        if (count($timeComponents) > 2) {
            $timeAsString = $timeComponents[0] . ':' . $timeComponents[1];
        }

        return $timeAsString;
    }

    /**
     * Get array for delivery endpoint
     *
     * @param        $carrier
     * @param string $key
     *
     * @return array
     */
    public function getArrayConfig($carrier, $key): array
    {
        return array_map(static function($val) {
            return (is_numeric($val)) ? (int) $val : $val;
        }, explode(',', $this->getCarrierConfig($key, $carrier)));
        //return str_replace(',', ';', $this->getCarrierConfig($key, $carrier));
    }

    /**
     * Get array for delivery endpoint
     *
     * @param string $carrier
     * @param string $key
     *
     * @return float
     */
    public function getIntegerConfig($carrier, $key)
    {
        return (float) $this->getCarrierConfig($key, $carrier);
    }
}
