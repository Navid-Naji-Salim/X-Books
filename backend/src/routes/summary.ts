import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const summaryRouter = Router();

summaryRouter.get("/", async (_req, res, next) => {
  try {
    // Prisma Dev can close a pooled local connection when several aggregate
    // queries start on the same request at once. Keep this tiny dashboard read
    // sequential so login-time workspace loading remains reliable.
    const items = await prisma.item.findMany();
    const customerCount = await prisma.customer.count();
    const vendorCount = await prisma.vendor.count();

    const inventoryValue = items.reduce(
      (total, item) => total + Number(item.unitCost) * item.quantity,
      0,
    );

    res.json({
      itemCount: items.length,
      customerCount,
      vendorCount,
      inventoryValue,
      activeItemCount: items.filter((item) => item.isActive).length,
    });
  } catch (error) {
    next(error);
  }
});
