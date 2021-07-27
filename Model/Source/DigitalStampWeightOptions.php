<?php
/**
 * Get only the "No" option for in the MyParcel system settings
 * This option is used with settings that are not possible because an parent option is turned off.
 *
 * If you want to add improvements, please create a fork in our GitHub:
 * https://github.com/myparcelbe
 *
 * @author      Richard Perdaan <support@sendmyparcel.be>
 * @copyright   2010-2017 MyParcel
 * @license     http://creativecommons.org/licenses/by-nc-nd/3.0/nl/deed.en_US  CC BY-NC-ND 3.0 NL
 * @link        https://github.com/myparcelbe/magento
 * @since       File available since Release v0.1.0
 */

namespace MyParcelBE\Magento\Model\Source;

use Magento\Framework\Option\ArrayInterface;
use Magento\Sales\Model\Order;
use MyParcelBE\Magento\Helper\Data;

/**
 * @api
 * @since 100.0.2
 */
class DigitalStampWeightOptions implements ArrayInterface
{
    /**
     * @var Data
     */
    static private $helper;

    /**
     * Insurance constructor.
     *
     * @param $order Order
     * @param $helper Data
     */
    public function __construct(Data $helper)
    {
        self::$helper = $helper;
    }

    /**
     * @param $option
     *
     * @return bool
     */
    public function getDefault($option)
    {
        $settings = self::$helper->getStandardConfig('options');

        if ($settings[$option . '_active'] == '1') {
            return true;
        }

        return false;
    }

    /**
     * Options getter
     *
     * @return array
     */
    public function toOptionArray()
    {
        $digitalStampOptions = [
            ['value' => 0, 'label' => __('No standard weight')],
            ['value' => 20, 'label' => __('0 - 20 gram')],
            ['value' => 50, 'label' => __('20 - 50 gram')],
            ['value' => 100, 'label' => __('50 - 100 gram')],
            ['value' => 350, 'label' => __('100 - 350 gram')],
            ['value' => 2000, 'label' => __('350 - 2000 gram')]
        ];

        return $digitalStampOptions;
    }
}
