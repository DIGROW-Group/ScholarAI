/**
 * Utility functions for cleaning and normalizing company names
 */

/**
 * Normalize company name by removing common legal suffixes and formatting.
 * This function removes legal forms like SARL, SA, SARLAU, etc.
 * 
 * @param {string} companyName - Raw company name
 * @returns {string} Cleaned company name
 */
export const normalizeCompanyName = (companyName) => {
  if (!companyName) {
    return '';
  }
  
  // Convert to uppercase and remove extra whitespace
  let normalized = companyName.trim().toUpperCase();
  
  // Remove common legal suffixes including Moroccan company types
  const suffixesToRemove = [
    'S.A.', 'SA', 'SARL AU', 'SARLAU', 'SARL', 'SAS', 'SASU', 'EURL', 'SNC', 'SCA', 'SCS',
    'SOCIETE ANONYME', 'SOCIETE A RESPONSABILITE LIMITEE',
    'SOCIETE EN NOM COLLECTIF', 'SOCIETE EN COMMANDITE SIMPLE',
    'SOCIETE EN COMMANDITE PAR ACTIONS',
    // Moroccan specific company types
    'SARLAU', 'SARL', 'SA', 'S.A', 'S.A.', 'SOCIETE ANONYME',
    'SOCIETE A RESPONSABILITE LIMITEE', 'SOCIETE A RESPONSABILITE LIMITEE UNIPERSONNELLE',
    'SOCIETE EN NOM COLLECTIF', 'SOCIETE EN COMMANDITE SIMPLE',
    'SOCIETE EN COMMANDITE PAR ACTIONS', 'SOCIETE CIVILE',
    'SOCIETE CIVILE IMMOBILIERE', 'SOCIETE CIVILE PROFESSIONNELLE',
    'GROUPEMENT D INTERET ECONOMIQUE', 'GIE',
    'ETABLISSEMENT PUBLIC', 'EP', 'ETABLISSEMENT PUBLIC A CARACTERE INDUSTRIEL ET COMMERCIAL',
    'EPIC', 'ETABLISSEMENT PUBLIC A CARACTERE ADMINISTRATIF', 'EPA',
    'COOPERATIVE', 'COOP', 'MUTUELLE', 'ASSOCIATION', 'FONDATION'
  ];
  
  for (const suffix of suffixesToRemove) {
    // Remove suffix at the end of the string (with optional spaces)
    const pattern = new RegExp(`\\s*${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    normalized = normalized.replace(pattern, '');
  }
  
  // Remove common punctuation and extra spaces
  normalized = normalized.replace(/[^\w\s]/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
};

/**
 * Format company name for display with proper capitalization
 * @param {string} companyName - Company name to format
 * @returns {string} Formatted company name
 */
export const formatCompanyNameForDisplay = (companyName) => {
  const cleaned = normalizeCompanyName(companyName);
  
  // Convert to title case (first letter of each word capitalized)
  return cleaned
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
