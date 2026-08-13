import { Router } from "express";
import { randomUUID } from "node:crypto";
import type { Customer } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { presentContact } from "../presenters/contact-presenter.js";
import { parseCustomerInput } from "../services/customer-input.js";
import { parseBody } from "../utils/request.js";
import { ApiError } from "../utils/api-error.js";
import { authenticatedUserId } from "../utils/auth-user.js";

export const customersRouter = Router();

customersRouter.get("/", async (_req, res, next) => {
  try {
    const userId = authenticatedUserId(res);
    const customers = await prisma.customer.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    res.json(customers.map(presentContact));
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/", async (req, res, next) => {
  try {
    const userId = authenticatedUserId(res);
    const customerInput = parseCustomerInput(parseBody(req));
    const { customerType, companyName, firstName, lastName, displayName } = customerInput;
    const id = randomUUID();
    const { email, phone, addressLine1, addressLine2, city, state, postalCode, country, taxRate, paymentTerms, notes } = customerInput;
    const [customer] = await prisma.$queryRaw<Customer[]>`
      INSERT INTO "Customer" (
        "id", "userId", "customerType", "firstName", "lastName", "displayName", "companyName",
        "email", "phone", "addressLine1", "addressLine2", "city", "state",
        "postalCode", "country", "taxRate", "paymentTerms", "notes", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${userId}, ${customerType}, ${firstName}, ${lastName}, ${displayName}, ${companyName},
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

customersRouter.patch("/:id", async (req, res, next) => {
  try {
    const userId = authenticatedUserId(res);
    const customer = await prisma.customer.update({
      where: { id: req.params.id, userId },
      data: parseCustomerInput(parseBody(req)),
    });
    res.json(presentContact(customer));
  } catch (error) {
    next(error);
  }
});

customersRouter.delete("/:id", async (req, res, next) => {
  try {
    const userId = authenticatedUserId(res);
    await prisma.customer.delete({ where: { id: req.params.id, userId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
