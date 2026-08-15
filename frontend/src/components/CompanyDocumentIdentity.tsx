import type { CompanyProfile } from "../types";

export const companyAddressLine = (company: CompanyProfile) => [
  company.addressLine1,
  company.addressLine2,
  [company.city, company.state, company.postalCode].filter(Boolean).join(", "),
  company.country,
].filter(Boolean).join(" · ");

export const companyContactLine = (company: CompanyProfile) => [
  company.businessEmail,
  company.phone,
  company.taxId ? `Tax ID: ${company.taxId}` : null,
].filter(Boolean).join(" · ");

export const CompanyDocumentIdentity = ({ company, label }: { company: CompanyProfile; label: string }) => {
  const address = companyAddressLine(company);
  const contact = companyContactLine(company);
  return (
    <div className="document-company-identity" translate="no">
      <span>{label}</span>
      <strong>{company.name}</strong>
      {address ? <small>{address}</small> : null}
      {contact ? <small>{contact}</small> : null}
    </div>
  );
};
