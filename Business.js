import * as Storage from './Persistence.js'
import 'dotenv/config'

// Gets the services from the Persistence layer.
// Business doesn't care where they came from.
export async function fetchServices() {

    const services = await Storage.loadServices()

    return services
}


// Finds a customer using their ID.
export async function findCustomer(customerId) {

    const customer = await Storage.searchCustomer(customerId)

    return customer
}


// Finds one laundry service.
export async function findService(serviceId) {

    const service = await Storage.searchService(serviceId)

    return service
}


// Gets only the price because sending the entire service back
// would be a little unnecessary.
export async function getServiceCost(serviceId) {

    const service = await Storage.searchService(serviceId)

    if (!service) {
        return null
    }

    return service.price
}


// Gets all orders for a customer and calculates their totals.
//
// The total calculation belongs here because this is business logic,
// not something the presentation layer should have to figure out.
export async function fetchOrdersForCustomer(customerId) {

    const orders = await Storage.searchCustomerOrders(customerId)
    const orderSummaries = []

    for (const currentOrder of orders) {

        let calculatedTotal = 0

        for (const item of currentOrder.items) {

            const price = await getServiceCost(item.serviceId)

            calculatedTotal += price * item.quantity
        }

        orderSummaries.push({
            order: currentOrder.orderId,
            date: currentOrder.orderDate,
            status: currentOrder.status,
            total: calculatedTotal
        })
    }

    return orderSummaries
}


// Finds one complete order.
export async function findOrder(orderId) {

    return await Storage.searchOrder(orderId)
}


// Gets the next order number and formats it for the application.
export async function generateOrderId() {

    const numberFromStorage = await Storage.findNextOrderNumber()

    const formattedNumber =
        'O' + String(numberFromStorage).padStart(3, '0')

    return formattedNumber
}


// Sends the new order to Persistence.
// Business doesn't directly touch the JSON file.
export async function storeOrder(newOrder) {

    await Storage.addOrder(newOrder)
}


// Checks whether an order is allowed to move to a new status.
//
// The order has a very strict career path:
//
// Received -> Washing -> Ready -> Delivered
//
// Apparently even laundry needs promotions.
export async function changeOrderStatus(order, requestedStatus) {

    if (!order) {
        return false
    }

    const allowedStatuses = [
        'Received',
        'Washing',
        'Ready',
        'Delivered'
    ]

    const oldPosition = allowedStatuses.indexOf(order.status)
    const newPosition = allowedStatuses.indexOf(requestedStatus)

    // Unknown statuses and backwards movement are not allowed.
    if (newPosition === -1 || newPosition <= oldPosition) {
        return false
    }

    order.status = requestedStatus

    await Storage.saveUpdatedOrder(order)

    return true
}


/**
 * calculates the total price for a customer so he or she can 
 * know what is the total amount and pay it
 */
export async function calculateTheSubtotal(OrderAsArray) {
    const minCharge = Number(process.env.MINIMUM_ORDER_CHARGE || 25)
    const freeDeliveryLimit = Number(process.env.FREE_DELIVERY_THRESHOLD || 50)
    const baseDeliveryFee = Number(process.env.DELIVERY_CHARGE || 10)

    let rawSubtotal = 0

    for (let singleOrder of OrderAsArray) {
        rawSubtotal += singleOrder.total
    }

    let adjustedSubtotal = rawSubtotal < minCharge ? minCharge : rawSubtotal
    let deliveryFee = rawSubtotal < freeDeliveryLimit ? baseDeliveryFee : 0

    return adjustedSubtotal + deliveryFee
}


/**
 * computes the total by multiplying price with quantity
 * @param {*} unitPrice 
 * @param {*} quantity 
 * @returns 
 */
export function computeItemLineTotal(unitPrice, quantity) {
    return unitPrice * quantity
}

/**
 * gets also the total but with conditions applied and with
 * better handling some complex paramaters 
 * @param {*} order 
 * @returns 
 */
export async function computeOrderBreakdown(order) {
    const minCharge = Number(process.env.MINIMUM_ORDER_CHARGE || 0)
    const freeDeliveryLimit = Number(process.env.FREE_DELIVERY_THRESHOLD || 0)
    const baseDeliveryFee = Number(process.env.DELIVERY_CHARGE || 0)

    let subtotalPrice = 0

    for (const item of order.items) {
        const itemPrice = await getServiceCost(item.serviceId)
        if (itemPrice === null) return null
        
        subtotalPrice += itemPrice * item.quantity
    }

    let minOrderAdjustment = 0
    let adjustedServiceFee = subtotalPrice
    let deliveryFee = 0

    if (subtotalPrice < minCharge) {
        minOrderAdjustment = minCharge - subtotalPrice
        adjustedServiceFee = minCharge
    }

    if (subtotalPrice < freeDeliveryLimit) {
        deliveryFee = baseDeliveryFee
    }

    const grandTotal = adjustedServiceFee + deliveryFee

    return {
        subtotalPrice,
        minOrderAdjustment,
        deliveryFee,
        grandTotal
    }
}