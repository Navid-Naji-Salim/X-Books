import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { presentContact } from "../presenters/contact-presenter.js";
import { parseVendorInput } from "../services/vendor-input.js";
import { parseBody } from "../utils/request.js";
import { authenticatedCompanyId } from "../utils/auth-user.js";

export const vendorsRouter = Router();

vendorsRouter.get("/", async (_req, res, next) => {
  try {
    const companyId = authenticatedCompanyId(res);
    const vendors = await prisma.vendor.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
    res.json(vendors.map(presentContact));
  } catch (error) {
    next(error);
  }
});

vendorsRouter.post("/", async (req, res, next) => {
  try {
    const companyId = authenticatedCompanyId(res);
    const body = parseBody(req);
    const vendor = await prisma.vendor.create({
      data: { ...parseVendorInput(body), companyId },
    });

    res.status(201).json(presentContact(vendor));
  } catch (error) {
    next(error);
  }
});

vendorsRouter.patch("/:id", async (req, res, next) => {
  try {
    const companyId = authenticatedCompanyId(res);
    const body = parseBody(req);
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id, companyId },
      data: parseVendorInput(body),
    });
    res.json(presentContact(vendor));
  } catch (error) { next(error); }
});

vendorsRouter.delete("/:id", async (req, res, next) => {
  try {
    const companyId = authenticatedCompanyId(res);
    await prisma.vendor.delete({ where: { id: req.params.id, companyId } });
    res.status(204).send();
  } catch (error) { next(error); }
});
