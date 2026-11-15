export const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING_PAYMENT: { label: "ממתינה לתשלום", cls: "" },
  PAID: { label: "חדשה", cls: "blue" },
  PROCESSING: { label: "בטיפול", cls: "orange" },
  SHIPPED: { label: "נשלחה", cls: "green" },
  DELIVERED: { label: "נמסרה", cls: "green" },
  CANCELLED: { label: "בוטלה", cls: "pink" },
  REFUNDED: { label: "הוחזרה", cls: "pink" },
};
