import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { presentContact } from "../presenters/contact-presenter.js";
import { parseBody } from "../utils/request.js";
import { optionalString, requiredString } from "../utils/validation.js";

export const customersRouter = Router();

customersRouter.get("/", async (_req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({ orderBy: { createdAt: "desc" } });
    res.json(customers.map(presentContact));
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/", async (req, res, next) => {
  try {
    const body = parseBody(req);
    const customer = await prisma.customer.create({
      data: {
        customerType: optionalString(body, "customerType") ?? "business",
        salutation: optionalString(body, "salutation"),
        firstName: optionalString(body, "firstName"),
        lastName: optionalString(body, "lastName"),
        displayName: requiredString(body, "displayName"),
        companyName: optionalString(body, "companyName"),
        email: optionalString(body, "email"),
        phone: optionalString(body, "phone"),
        mobile: optionalString(body, "mobile"),
        addressLine1: optionalString(body, "addressLine1"),
        addressLine2: optionalString(body, "addressLine2"),
        city: optionalString(body, "city"),
        state: optionalString(body, "state"),
        postalCode: optionalString(body, "postalCode"),
        country: optionalString(body, "country"),
        taxRate: optionalString(body, "taxRate"),
        paymentTerms: optionalString(body, "paymentTerms") ?? "Due on Receipt",
        notes: optionalString(body, "notes"),
      },
    });

    res.status(201).json(presentContact(customer));
  } catch (error) {
    next(error);
  }
});

customersRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
