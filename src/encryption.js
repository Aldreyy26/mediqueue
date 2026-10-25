import CryptoJS from 'crypto-js';

// Ito ang secret key ng system ninyo. Kapag walang key na ito, hindi mababasa ng mga hackers ang database.
const SECRET_KEY = "MediQueue_SecureKey_2026"; 

export const encryptData = (data) => {
    if (!data) return '';
    return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
};

export const decryptData = (cipherText) => {
    if (!cipherText) return '';
    try {
        const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        // Fallback: Kung sakaling luma ang data at hindi encrypted, ibabalik niya yung original
        return decrypted ? decrypted : cipherText; 
    } catch (error) {
        return cipherText;
    }
};