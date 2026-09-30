import * as Storage from './Persistence.js'


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
        '0' + String(numberFromStorage).padStart(3, '0')

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

export async function calculateTheSubtotal(OrderAsArray) {
    let price_total = 0
    

    for(let totalOfOrder of OrderAsArray){
        price_total += totalOfOrder.total
    }

    let holder = price_total

    if(price_total < 25){
        let deffrence = 25 - price_total
        holder += deffrence 
    }
    
    if(price_total < 50){
        holder += 10
    }

    price_total = holder
    return price_total
}