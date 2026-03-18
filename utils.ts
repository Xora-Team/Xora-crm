
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
