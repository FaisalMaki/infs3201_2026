import fs from 'fs/promises'


// Reads the services file and turns the JSON into JavaScript data.
export async function loadServices() {

    const fileContents = await fs.readFile(
        'services.json',
        'utf8'
    )

    return JSON.parse(fileContents)
}


// Loads every order from the orders file.
export async function loadOrders() {

    const fileContents = await fs.readFile(
        'orders.json',
        'utf8'
    )

    return JSON.parse(fileContents)
}


// Loads all customers from the customer file.
export async function loadCustomers() {

    const fileContents = await fs.readFile(
        'customers.json',
        'utf8'
    )

    return JSON.parse(fileContents)
}


// Looks for one customer without making Business
// search through the entire customer list.
export async function searchCustomer(customerId) {

    const customers = await loadCustomers()

    for (const customer of customers) {

        if (customer.customerId === customerId) {
            return customer
        }
    }

    return null
}


// Finds one order by its ID.
export async function searchOrder(orderId) {

    const orders = await loadOrders()

    for (const currentOrder of orders) {

        if (currentOrder.orderId === orderId) {
            return currentOrder
        }
    }

    return null
}


// Finds one service by its service ID.
export async function searchService(serviceId) {

    const services = await loadServices()

    for (const service of services) {

        if (service.serviceId === serviceId) {
            return service
        }
    }

    return null
}


// Gets only the orders belonging to one customer.
export async function searchCustomerOrders(customerId) {

    const allOrders = await loadOrders()
    const matchingOrders = []

    for (const order of allOrders) {

        if (order.customerId === customerId) {
            matchingOrders.push(order)
        }
    }

    return matchingOrders
}


// Adds a new order to the JSON file.
//
// We read the old list, add the new order,
// then save the complete list again.
export async function addOrder(newOrder) {

    const orders = await loadOrders()

    orders.push(newOrder)

    const updatedFile = JSON.stringify(
        orders,
        null,
        4
    )

    await fs.writeFile(
        'orders.json',
        updatedFile
    )
}


// Replaces the old version of an order with the updated one.
export async function saveUpdatedOrder(updatedOrder) {

    const orders = await loadOrders()

    for (let position = 0; position < orders.length; position++) {

        if (orders[position].orderId === updatedOrder.orderId) {
            orders[position] = updatedOrder
            break
        }
    }

    const updatedFile = JSON.stringify(
        orders,
        null,
        4
    )

    await fs.writeFile(
        'orders.json',
        updatedFile
    )
}


// Finds the largest order number and returns the next number.
//
// Persistence returns a number here.
// Business is responsible for turning that number
// into the application's order-ID format.
export async function findNextOrderNumber() {

    const orders = await loadOrders()

    let biggestNumber = 0

    for (const order of orders) {

        const numericPart = Number(
            order.orderId.substring(1)
        )

        if (numericPart > biggestNumber) {
            biggestNumber = numericPart
        }
    }

    return biggestNumber + 1
}