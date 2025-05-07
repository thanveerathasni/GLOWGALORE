const Order = require("../../models/orderSchema");
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const loadSalesPage = async (req, res) => {
  try {
    const { reportType, startDate, endDate, format, page = 1, limit = 5 } = req.query;

    let query = {};
    const now = new Date();
    switch (reportType) {
      case 'daily':
        query.createdOn = {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lte: new Date(now.setHours(23, 59, 59, 999))
        };
        break;
        case 'weekly':
          //  Calculate week start (Sunday) and end (Saturday)
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay()); 
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6); 
          query.createdOn = {
            $gte: new Date(weekStart.setHours(0, 0, 0, 0)),
            $lte: new Date(weekEnd.setHours(23, 59, 59, 999))
          };
        break;
      case 'monthly':
        query.createdOn = {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        };
        break;
      case 'custom':
        if (startDate && endDate) {
          query.createdOn = {
            $gte: new Date(startDate),
            $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
          };
        }
        break;
      default:
        query.createdOn = { $lte: now };
    }

    query.status = 'Delivered';

    // Pagination calculations
    const currentPage = parseInt(page);
    const itemsPerPage = parseInt(limit);
    const skip = (currentPage - 1) * itemsPerPage;

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / itemsPerPage);

    const orders = await Order.find(query)
      .populate('orderedItems.product')
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(itemsPerPage);

    let totalFinalAmount = 0;

    const sales = orders.map(order => {
      const orderRegularPrice = order.totalPrice;
      const finalAmount = order.finalAmount;
      totalFinalAmount += finalAmount;

      const itemDiscount = orderRegularPrice - finalAmount;
      const couponDiscount = order.discount || 0;

      return {
        orderId: order.orderId,
        amount: finalAmount,
        discount: itemDiscount,
        coupon: couponDiscount,
        date: order.createdOn
      };
    });

    const salesData = {
      sales,
      totalSales: totalFinalAmount,
      orderCount: totalOrders,
      discounts: sales.reduce((sum, sale) => sum + sale.discount, 0),
      coupons: sales.reduce((sum, sale) => sum + sale.coupon, 0),
      chartData: sales.map(sale => ({
        date: sale.date.toISOString().split('T')[0],
        amount: sale.amount
      })),
      reportType,
      startDate,
      endDate,
      currentPage,
      totalPages,
      limit
    };

    if (format === 'pdf') {
      return generatePDF(res, salesData);
    } else if (format === 'excel') {
      return generateExcel(res, salesData);
    }

    res.render('sales-report', { salesData });
  } catch (error) {
    console.error('Error in loadSalesPage:', error);
    res.status(500).render('admin/pageerror', {
      message: 'Error loading sales report',
      error: error.message
    });
  }
};
const generatePDF = async (res, salesData) => {
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

  doc.pipe(res);
  doc.fontSize(20).text('Glow Galore Sales Report', { align: 'center' });
  doc.moveDown();

  doc.fontSize(14).text('Summary');
  doc.fontSize(12)
    .text(`Total Sales: ₹${salesData.totalSales.toLocaleString()}`)
    .text(`Total Orders: ${salesData.orderCount}`)
    .text(`Total Discounts: ₹${salesData.discounts.toLocaleString()}`)
    .text(`Total Coupons: ₹${salesData.coupons.toLocaleString()}`);
  doc.moveDown();

  doc.fontSize(14).text('Detailed Sales');
  const headers = ['Date', 'Order ID', 'Amount', 'Discount', 'Coupon'];
  let x = 50, y = doc.y + 20;
  headers.forEach(header => {
    doc.text(header, x, y);
    x += 100;
  });

  // Fetch all orders for PDF
  let query = {};
  const now = new Date();
  switch (salesData.reportType) {
    case 'daily':
      query.createdOn = {
        $gte: new Date(now.setHours(0, 0, 0, 0)),
        $lte: new Date(now.setHours(23, 59, 59, 999))
      };
      break;
      case 'weekly':
        //  Calculate week start (Sunday) and end (Saturday)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Set to Sunday of current week
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Set to Saturday
        query.createdOn = {
          $gte: new Date(weekStart.setHours(0, 0, 0, 0)),
          $lte: new Date(weekEnd.setHours(23, 59, 59, 999))
        };
      break;
    case 'monthly':
      query.createdOn = {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      };
      break;
    case 'custom':
      if (salesData.startDate && salesData.endDate) {
        query.createdOn = {
          $gte: new Date(salesData.startDate),
          $lte: new Date(new Date(salesData.endDate).setHours(23, 59, 59, 999))
        };
      }
      break;
    default:
      query.createdOn = { $lte: now };
  }
  query.status = 'Delivered';

  const allOrders = await Order.find(query)
    .populate('orderedItems.product')
    .sort({ createdOn: -1 });

  const allSales = allOrders.map(order => ({
    orderId: order.orderId,
    amount: order.finalAmount,
    discount: order.totalPrice - order.finalAmount,
    coupon: order.discount || 0,
    date: order.createdOn
  }));

  y += 20;
  allSales.forEach(sale => {
    x = 50;
    doc.text(new Date(sale.date).toLocaleDateString(), x, y);
    x += 100;
    const shortOrderId = sale.orderId.toString().slice(-12);
    doc.text(shortOrderId, x, y);
    x += 100;
    doc.text(`₹${sale.amount.toLocaleString()}`, x, y);
    x += 100;
    doc.text(`₹${sale.discount.toLocaleString()}`, x, y);
    x += 100;
    doc.text(`₹${sale.coupon.toLocaleString()}`, x, y);
    y += 20;
  });

  doc.end();
};

const generateExcel = async (res, salesData) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Order ID', key: 'orderId', width: 30 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Discount', key: 'discount', width: 15 },
    { header: 'Coupon', key: 'coupon', width: 15 }
  ];

  worksheet.addRow(['Summary']);
  worksheet.addRow(['Total Sales', '', `₹${salesData.totalSales.toLocaleString()}`]);
  worksheet.addRow(['Total Orders', '', salesData.orderCount]);
  worksheet.addRow(['Total Discounts', '', `₹${salesData.discounts.toLocaleString()}`]);
  worksheet.addRow(['Total Coupons', '', `₹${salesData.coupons.toLocaleString()}`]);
  worksheet.addRow([]);

  // Fetch all orders for Excel
  let query = {};
  const now = new Date();
  switch (salesData.reportType) {
    case 'daily':
      query.createdOn = {
        $gte: new Date(now.setHours(0, 0, 0, 0)),
        $lte: new Date(now.setHours(23, 59, 59, 999))
      };
      break;
      case 'weekly':
        // Calculate week start (Sunday) and end (Saturday)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); 
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); 
        query.createdOn = {
          $gte: new Date(weekStart.setHours(0, 0, 0, 0)),
          $lte: new Date(weekEnd.setHours(23, 59, 59, 999))
        };
      break;
    case 'monthly':
      query.createdOn = {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      };
      break;
    case 'custom':
      if (salesData.startDate && salesData.endDate) {
        query.createdOn = {
          $gte: new Date(salesData.startDate),
          $lte: new Date(new Date(salesData.endDate).setHours(23, 59, 59, 999))
        };
      }
      break;
    default:
      query.createdOn = { $lte: now };
  }
  query.status = 'Delivered';

  const allOrders = await Order.find(query)
    .populate('orderedItems.product')
    .sort({ createdOn: -1 });

  const allSales = allOrders.map(order => ({
    orderId: order.orderId,
    amount: order.finalAmount,
    discount: order.totalPrice - order.finalAmount,
    coupon: order.discount || 0,
    date: order.createdOn
  }));

  worksheet.addRow(['Detailed Sales']);
  allSales.forEach(sale => {
    worksheet.addRow({
      date: new Date(sale.date).toLocaleDateString(),
      orderId: sale.orderId.toString(),
      amount: `₹${sale.amount.toLocaleString()}`,
      discount: `₹${sale.discount.toLocaleString()}`,
      coupon: `₹${sale.coupon.toLocaleString()}`
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
  await workbook.xlsx.write(res);
};




module.exports = {
  loadSalesPage
};