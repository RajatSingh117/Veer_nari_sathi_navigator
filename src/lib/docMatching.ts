export function resolveConfirmedDocTypes(
  uploadedDocs?: string[],
  confirmedFields?: Record<string, any>
): Set<string> {
  const docSet = new Set<string>();

  // 1. Explicit doc types passed in uploadedDocs
  if (Array.isArray(uploadedDocs)) {
    uploadedDocs.forEach((d) => docSet.add(d.toLowerCase().trim()));
  }

  // 2. Check if uploaded_docs or _uploadedDocs was encoded in confirmedFields
  if (confirmedFields) {
    if (Array.isArray(confirmedFields.uploaded_docs)) {
      confirmedFields.uploaded_docs.forEach((d: string) => docSet.add(d.toLowerCase().trim()));
    }
    if (typeof confirmedFields._uploadedDocs === 'string') {
      try {
        const parsed = JSON.parse(confirmedFields._uploadedDocs);
        if (Array.isArray(parsed)) {
          parsed.forEach((d: string) => docSet.add(d.toLowerCase().trim()));
        }
      } catch {}
    }

    // 3. Infer from confirmed field presence
    const val = (k: string) => {
      const v = confirmedFields[k];
      return typeof v === 'string' ? v.trim() : (v?.value ? String(v.value).trim() : '');
    };

    // If service fields confirmed -> service_record present
    if (val('service_number') && val('service_number') !== 'Not found') {
      docSet.add('service_record');
      docSet.add('discharge_book');
    }
    if (val('rank') && val('rank') !== 'Not found') {
      docSet.add('service_record');
    }

    // If death/casualty fields confirmed -> death_certificate & casualty report present
    if (val('date_of_death') && val('date_of_death') !== 'Not found') {
      docSet.add('death_certificate');
      docSet.add('casualty_report');
    }
    if (val('cause_category') && val('cause_category') !== 'Not found') {
      docSet.add('casualty_report');
    }

    // If ID / Aadhar confirmed
    if (val('aadhar') && val('aadhar') !== 'Not found') {
      docSet.add('id_proof');
      docSet.add('aadhar');
    }
    if (val('id_proof') && val('id_proof') !== 'Not found') {
      docSet.add('id_proof');
    }

    // If bank details confirmed
    if (val('bank_account') || val('bank_details') || val('bank_mandate')) {
      docSet.add('bank_details');
      docSet.add('bank_mandate');
    }

    // If domicile confirmed
    if (val('domicile') || val('domicile_certificate')) {
      docSet.add('domicile_certificate');
    }
  }

  return docSet;
}

export function isDocumentCovered(docName: string, confirmedDocTypes: Set<string>): boolean {
  const d = docName.toLowerCase();

  // Death Certificate
  if (d.includes('death certificate')) {
    return confirmedDocTypes.has('death_certificate') || confirmedDocTypes.has('death_cert');
  }

  // Official Casualty Report
  if (d.includes('casualty report')) {
    return confirmedDocTypes.has('casualty_report') || confirmedDocTypes.has('death_certificate');
  }

  // Service Discharge Book or PPO
  if (d.includes('discharge book') || d.includes('ppo') || d.includes('discharge')) {
    return (
      confirmedDocTypes.has('service_record') ||
      confirmedDocTypes.has('discharge_book') ||
      confirmedDocTypes.has('ppo')
    );
  }

  // Aadhar / Identity Proof
  if (d.includes('aadhar') || d.includes('identity proof') || d.includes('id proof')) {
    return (
      confirmedDocTypes.has('id_proof') ||
      confirmedDocTypes.has('aadhar') ||
      confirmedDocTypes.has('identity_proof')
    );
  }

  // Bank Account / Bank Mandate
  if (d.includes('bank account') || d.includes('bank mandate') || d.includes('bank')) {
    return (
      confirmedDocTypes.has('bank_details') ||
      confirmedDocTypes.has('bank_mandate') ||
      confirmedDocTypes.has('bank_account')
    );
  }

  // Domicile Certificate
  if (d.includes('domicile')) {
    return (
      confirmedDocTypes.has('domicile_certificate') ||
      confirmedDocTypes.has('domicile') ||
      confirmedDocTypes.has('domicile_maharashtra')
    );
  }

  // Children's education: School/College ID
  if (d.includes('school') || d.includes('college')) {
    return (
      confirmedDocTypes.has('school_id') ||
      confirmedDocTypes.has('college_id') ||
      confirmedDocTypes.has('student_id')
    );
  }

  // Marksheets
  if (d.includes('marksheet')) {
    return confirmedDocTypes.has('marksheets') || confirmedDocTypes.has('marksheet');
  }

  // Photographs
  if (d.includes('photograph') || d.includes('photo')) {
    return confirmedDocTypes.has('photographs') || confirmedDocTypes.has('photo');
  }

  // Proof of relationship
  if (d.includes('relationship')) {
    return confirmedDocTypes.has('proof_of_relationship') || confirmedDocTypes.has('relationship_proof');
  }

  return false;
}

export function computeBenefitDocStatus(
  requiredDocs: string[],
  confirmedDocTypes: Set<string>
): { status: 'ready' | 'missing_docs'; missingDocs: string[] } {
  const missingDocs = requiredDocs.filter((doc) => !isDocumentCovered(doc, confirmedDocTypes));
  const status: 'ready' | 'missing_docs' = missingDocs.length === 0 ? 'ready' : 'missing_docs';
  return { status, missingDocs };
}
