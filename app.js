import 'dotenv/config' 
import promptSync from 'prompt-sync'
import * as Logic from './Business.js'

const input = promptSync()



// Shows the laundry services available.
// Because remembering all these service IDs is not happening.
async function displayServices() {

    const laundryList = await Logic.fetchServices()

    console.log('\n')
    console.log('Service ID Service                    Unit    Price')
    console.log('---------- -------------------------- ------- ------')

    for (const laundry of laundryList) {
        const serviceCode = laundry.serviceId.padEnd(10)
        const serviceName = laundry.name.padEnd(26)
        const serviceUnit = laundry.unit.padEnd(5)
        const servicePrice = laundry.price.toFixed(2).padStart(8)

        console.log(
            `${serviceCode} ${serviceName} ${serviceUnit} ${servicePrice}`
        )
    }

    console.log('\n')
}


// Finds a customer's orders and prints them.
// The customer has to exist first, which seems reasonable.
async function displayCustomerOrders() {

    const customerCode = input('Enter customer ID: ').trim().toUpperCase()
    const customerInfo = await Logic.findCustomer(customerCode)

    if (!customerInfo) {
        console.log('**** customer not found')
        return
    }

    console.log(`Orders for ${customerInfo.name}`)

    const customerOrders = await Logic.fetchOrdersForCustomer(customerCode)

    console.log('Order ID  Order Date  Status      Total')

    console.log('--------  ----------  ----------- -----')
    
    for (const currentOrder of customerOrders) {

        const orderCode = currentOrder.order.padEnd(8)
        const orderDate = currentOrder.date.padEnd(10)
        const orderStatus = currentOrder.status.padEnd(11)
        const orderTotal = currentOrder.total.toFixed(2).padStart(5)

        console.log(
            `${orderCode}  ${orderDate}  ${orderStatus} ${orderTotal}`
        )
    }
    let total_price = await Logic.calculateTheSubtotal(customerOrders)
    console.log('your total is ' + total_price)
    console.log('-------------------------')
    
    console.log(' ')

}


// Creates a new laundry order.
export async function placeOrder() {

    const customerCode = input('Enter customer ID: ').trim().toUpperCase()

    const customerInfo = await Logic.findCustomer(customerCode)

    if (!customerInfo) {
        console.log('**** customer not found')
        return
    }

    const selectedItems = []

    while (true) {

        const serviceCode = input(
            'Enter service ID (blank to finish): '
        ).trim().toUpperCase()

        if (serviceCode === '') {
            break
        }

        const chosenService = await Logic.findService(serviceCode)

        if (!chosenService) {
            console.log('**** service not found')
            continue
        }

        const amount = Number(input('Enter quantity: '))

        selectedItems.push({
            serviceId: serviceCode,
            quantity: amount
        })
    }

    if (selectedItems.length === 0) {
        console.log('**** order must contain at least one service')
        return
    }

    const newOrderCode = await Logic.generateOrderId()
    const dateCreated = new Date().toISOString().substring(0, 10)

    const laundryOrder = {
        orderId: newOrderCode,
        customerId: customerCode,
        orderDate: dateCreated,
        status: 'Received',
        items: selectedItems
    }

    // CALCULATE FINAL TOTAL USING BUSINESS LOGIC
    const pricing = await Logic.computeOrderBreakdown(laundryOrder)

    await Logic.storeOrder(laundryOrder)

    console.log(`Order ${newOrderCode} created`)
    console.log(`Total price: ${pricing.grandTotal.toFixed(2)} QAR`)
}


// Changes the status of an order if Business says the change is allowed.
async function changeStatus() {

    const orderCode = input('Enter order ID: ').trim().toUpperCase()
    const selectedOrder = await Logic.findOrder(orderCode)

    if (!selectedOrder) {
        console.log('not found')
        return
    }

    console.log(`Current status: ${selectedOrder.status}`)

    let requestedStatus = input('Enter new status: ').trim()

    if (requestedStatus.length > 0) {
        requestedStatus =
            requestedStatus.charAt(0).toUpperCase() +
            requestedStatus.slice(1).toLowerCase()
    }

    const wasUpdated = await Logic.changeOrderStatus(
        selectedOrder,
        requestedStatus
    )

    if (wasUpdated) {
        console.log('Status updated')
    } else {
        console.log('New status not accepted')
    }
}

/**
 * Displays a invoice receipt for a specific order
 */
async function displayInvoiceReceipt() {
    const orderCode = input('Enter order ID: ').trim().toUpperCase()
    const orderDetails = await Logic.findOrder(orderCode)

    if (!orderDetails) {
        console.log('**** order not found')
        return
    }

    const customerInfo = await Logic.findCustomer(orderDetails.customerId)
    if (!customerInfo) {
        console.log('**** customer not found')
        return
    }

    console.log(`Order: ${orderDetails.orderId}      Date: ${orderDetails.orderDate}      Status: ${orderDetails.status}`)
    console.log(`Customer: ${customerInfo.name}\n`)

    console.log('Service'.padEnd(25) + 'Qty'.padEnd(8) + 'Unit Price'.padEnd(12) + 'Line Total')
    console.log('-------'.padEnd(25) + '---'.padEnd(8) + '----------'.padEnd(12) + '----------')

    for (const item of orderDetails.items) {
        const service = await Logic.findService(item.serviceId)
        if (!service) {
            console.log(`**** service ${item.serviceId} not found`)
            return
        }

        const lineTotal = Logic.computeItemLineTotal(service.price, item.quantity)

        console.log(
            service.name.padEnd(25) +
            String(item.quantity).padEnd(8) +
            service.price.toFixed(2).padEnd(12) +
            lineTotal.toFixed(2)
        )
    }

    const pricingBreakdown = await Logic.computeOrderBreakdown(orderDetails)

    if (!pricingBreakdown) {
        console.log('**** unable to calculate invoice')
        return
    }

    console.log('')
    console.log(`Service subtotal: ${pricingBreakdown.subtotalPrice.toFixed(2)} QAR`)
    console.log(`Minimum-order adjustment: ${pricingBreakdown.minOrderAdjustment.toFixed(2)} QAR`)
    console.log(`Delivery charge: ${pricingBreakdown.deliveryFee.toFixed(2)} QAR`)
    console.log(`Final total: ${pricingBreakdown.grandTotal.toFixed(2)} QAR\n`)
}

// menu that shows the options
function menu() {
    let choice
    while (true) {
        console.log('1. Show laundry services')
        console.log('2. View customer orders')
        console.log('3. Update order status')
        console.log('4. Create new order')
        console.log('5. View invoice') 
        console.log('6. Exit\n')       

        choice = Number(input('What is your choice> '))

        if (choice >= 1 && choice <= 6) {
            return choice
        }

        console.log('*** Invalid input.. try again! ***')
    }
}


let programRunning = true

while (programRunning) {
    const selectedOption = menu()

    switch (selectedOption) {
        case 1:
            await displayServices()
            break
        case 2:
            await displayCustomerOrders()
            break
        case 3:
            await changeStatus()
            break
        case 4:
            await placeOrder()
            break
        case 5:
            await displayInvoiceReceipt()
            break
        case 6:
            programRunning = false
            break
    }
}

console.log('Thank you')