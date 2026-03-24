
/**
 * Formate un numéro de téléphone au format 00 00 00 00 00
 * @param phone Le numéro de téléphone à formater
 * @returns Le numéro formaté
 */
export const formatPhone = (phone: string | undefined | null): string => {
  if (!phone) return '';
  // Supprime tout ce qui n'est pas un chiffre
  const cleaned = phone.replace(/\D/g, '');
  // Limite à 10 chiffres pour le format standard français si besoin, 
  // mais ici on va juste grouper par 2 pour être flexible.
  const match = cleaned.match(/.{1,2}/g);
  return match ? match.join(' ') : cleaned;
};

/**
 * Formate un nom complet au format NOM Prénom
 * @param firstName Le prénom
 * @param lastName Le nom
 * @returns Le nom formaté
 */
export const formatName = (firstName: string | undefined | null, lastName: string | undefined | null): string => {
  const fName = firstName ? firstName.trim() : '';
  const lName = lastName ? lastName.trim() : '';
  
  if (!fName && !lName) return '';
  
  const formattedLastName = lName.toUpperCase();
  const formattedFirstName = fName ? fName.charAt(0).toUpperCase() + fName.slice(1).toLowerCase() : '';
  
  return `${formattedLastName} ${formattedFirstName}`.trim();
};

/**
 * Formate un nom complet au format Prénom NOM
 * @param firstName Le prénom
 * @param lastName Le nom
 * @returns Le nom formaté
 */
export const formatNameFirstLast = (firstName: string | undefined | null, lastName: string | undefined | null): string => {
  const fName = firstName ? firstName.trim() : '';
  const lName = lastName ? lastName.trim() : '';
  
  if (!fName && !lName) return '';
  
  const formattedLastName = lName.toUpperCase();
  const formattedFirstName = fName ? fName.charAt(0).toUpperCase() + fName.slice(1).toLowerCase() : '';
  
  return `${formattedFirstName} ${formattedLastName}`.trim();
};

/**
 * Tente de formater un nom complet à partir d'une seule chaîne
 * @param fullName Le nom complet
 * @returns Le nom formaté
 */
export const formatFullName = (fullName: string | undefined | null): string => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return fullName.toUpperCase();
  
  // Si on a plusieurs parties, on cherche s'il y en a une déjà en majuscules (le nom)
  const allCapsIndex = parts.findIndex(p => p.length > 1 && p === p.toUpperCase() && !p.match(/^\d+$/));
  
  if (allCapsIndex !== -1) {
    const lastName = parts[allCapsIndex];
    const otherParts = parts.filter((_, i) => i !== allCapsIndex);
    const firstName = otherParts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    return `${lastName} ${firstName}`.trim();
  }
  
  // Sinon, on suppose que le dernier mot est le nom
  const lastName = parts[parts.length - 1].toUpperCase();
  const firstNames = parts.slice(0, parts.length - 1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  
  return `${lastName} ${firstNames}`.trim();
};

/**
 * Tente de formater un nom complet au format Prénom NOM à partir d'une seule chaîne
 * @param fullName Le nom complet
 * @returns Le nom formaté
 */
export const formatFullNameFirstLast = (fullName: string | undefined | null): string => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return fullName.charAt(0).toUpperCase() + fullName.slice(1).toLowerCase();
  
  // Si on a plusieurs parties, on cherche s'il y en a une déjà en majuscules (le nom)
  // On cherche de la fin vers le début pour privilégier le dernier mot comme nom si plusieurs sont en majuscules
  const allCapsIndex = [...parts].reverse().findIndex(p => p.length > 1 && p === p.toUpperCase() && !p.match(/^\d+$/));
  const actualIndex = allCapsIndex !== -1 ? parts.length - 1 - allCapsIndex : -1;
  
  if (actualIndex !== -1) {
    const lastName = parts[actualIndex];
    const otherParts = parts.filter((_, i) => i !== actualIndex);
    const firstName = otherParts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    return `${firstName} ${lastName}`.trim();
  }
  
  // Sinon, on suppose que le dernier mot est le nom
  const lastName = parts[parts.length - 1].toUpperCase();
  const firstNames = parts.slice(0, parts.length - 1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  
  return `${firstNames} ${lastName}`.trim();
};
