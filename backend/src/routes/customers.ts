import { Router } from "express";
import { randomUUID } from "node:crypto";
import type { Customer } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { presentContact } from "../presenters/contact-presenter.js";
import { parseBody } from "../utils/request.js";
import { optionalString } from "../utils/validation.js";
import { ApiError } from "../utils/api-error.js";

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
    const customerType = optionalString(body, "customerType") ?? "business";
    if (!['business', 'individual'].includes(customerType)) {
      throw new ApiError(400, "Customer type must be Business or Individual.");
    }
    const companyName = optionalString(body, "companyName");
    const firstName = optionalString(body, "firstName");
    const lastName = optionalString(body, "lastName");
    const displayName = customerType === "business"
      ? companyName
      : [firstName, lastName].filter(Boolean).join(" ");

    if (!displayName || (customerType === "individual" && (!firstName || !lastName))) {
      throw new ApiError(400, customerType === "business" ? "Company name is required." : "First and last name are required.");
    }

    const id = randomUUID();
    const email = optionalString(body, "email");
    const phone = optionalString(body, "phone");
    const addressLine1 = optionalString(body, "addressLine1");
    const addressLine2 = optionalString(body, "addressLine2");
    const city = optionalString(body, "city");
    const state = optionalString(body, "state");
    const postalCode = optionalString(body, "postalCode");
    const country = optionalString(body, "country");
    const taxRate = optionalString(body, "taxRate");
    const paymentTerms = optionalString(body, "paymentTerms") ?? "Due on Receipt";
    const notes = optionalString(body, "notes");
    const [customer] = await prisma.$queryRaw<Customer[]>`
      INSERT INTO "Customer" (
        "id", "customerType", "firstName", "lastName", "displayName", "companyName",
        "email", "phone", "addressLine1", "addressLine2", "city", "state",
        "postalCode", "country", "taxRate", "paymentTerms", "notes", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${customerType}, ${firstName}, ${lastName}, ${displayName}, ${companyName},
        ${email}, ${phone}, ${addressLine1}, ${addressLine2}, ${city}, ${state},
        ${postalCode}, ${country}, ${taxRate}, ${paymentTerms}, ${notes}, NOW(), NOW()
      ) RETURNING *
    `;

    if (!customer) throw new ApiError(500, "Customer could not be saved.");

    res.status(201).json(presentContact(customer));
  } catch (error) {
    next(error);
  }
});

customersRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.$executeRaw`DELETE FROM "Customer" WHERE "id" = ${req.params.id}`;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
