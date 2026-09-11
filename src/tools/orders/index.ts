import { listOrders } from "./list_orders.js";
import { getOrder } from "./get_order.js";
import { createOrder } from "./create_order.js";
import { updateOrder } from "./update_order.js";
import { sendOrder } from "./send_order.js";
import { getOrderPdf } from "./get_order_pdf.js";
import { deleteOrder } from "./delete_order.js";
import { listOrderPositions } from "./list_order_positions.js";
import { getOrderPosition } from "./get_order_position.js";
import { updateOrderPosition } from "./update_order_position.js";
import { deleteOrderPosition } from "./delete_order_position.js";

export const tools = [
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  sendOrder,
  getOrderPdf,
  deleteOrder,
  listOrderPositions,
  getOrderPosition,
  updateOrderPosition,
  deleteOrderPosition
];
