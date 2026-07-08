import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { presentContact } from "../presenters/contact-presenter.js";
import { parseBody } from "../utils/request.js";
import { optionalString, requiredString } from "../utils/validation.js";

export const vendorsRouter = Router();

vendorsRouter.get("/", async (_req, res, next) => {
  try {
    const vendors = await prisma.vendor.findMany({ orderBy: { createdAt: "desc" } });
    res.json(vendors.map(presentContact));
  } catch (error) {
    next(error);
  }
});

vendorsRouter.post("/", async (req, res, next) => {
  try {
    const body = parseBody(req);
    const vendor = await prisma.vendor.create({
      data: {
        displayName: requiredString(body, "displayName"),
        email: optionalString(body, "email"),
        phone: optionalString(body, "phone"),
        addressLine1: optionalString(body, "addressLine1"),
        city: optionalString(body, "city"),
        state: optionalString(body, "state"),
        postalCode: optionalString(body, "postalCode"),
        country: optionalString(body, "country"),
        notes: optionalString(body, "notes"),
      },
    });

    res.status(201).json(presentContact(vendor));
  } catch (error) {
    next(error);
  }
});

vendorsRouter.patch("/:id", async (req, res, next) => {
  try {
    const body = parseBody(req);
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: {
        displayName: requiredString(body, "displayName"),
        email: optionalString(body, "email"),
        phone: optionalString(body, "phone"),
        addressLine1: optionalString(body, "addressLine1"),
        city: optionalString(body, "city"),
        state: optionalString(body, "state"),
        postalCode: optionalString(body, "postalCode"),
        country: optionalString(body, "country"),
        notes: optionalString(body, "notes"),
      },
    });
    res.json(presentContact(vendor));
  } catch (error) { next(error); }
});

vendorsRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.vendor.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) { next(error); }
});
