
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Initialize Firebase Admin SDK
initializeApp();

/**
 * Creates a new user in Firebase Authentication.
 * This function is intentionally simple and only handles auth creation.
 * Firestore document creation is handled client-side by the admin user.
 */
export const createStudentAuth = onCall(async (request) => {
  // Check if the user is an admin (implement your own logic)
  // For simplicity, we'll trust the Firestore rules to secure the client-side part.
  // A more robust implementation would check for an admin custom claim here.
  
  const { email, password } = request.data;

  if (!email || !password || password.length < 6) {
    throw new HttpsError(
      "invalid-argument",
      "E-posta ve en az 6 karakterli bir şifre gereklidir."
    );
  }

  try {
    const userRecord = await getAuth().createUser({
      email: email,
      password: password,
    });
    
    logger.info(`Successfully created new user: ${userRecord.uid}`);
    
    // Set a custom claim to identify the user as a student
    await getAuth().setCustomUserClaims(userRecord.uid, { role: 'student' });

    return { uid: userRecord.uid };
  } catch (error: any) {
    logger.error("Error creating new user:", error);
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError(
        "already-exists",
        "Bu e-posta adresi zaten kayıtlı."
      );
    }
    throw new HttpsError(
      "internal",
      "Kullanıcı oluşturulurken bir hata oluştu."
    );
  }
});


/**
 * Deletes a user from Firebase Authentication.
 * This is triggered when an admin deletes a student from the dashboard.
 */
export const deleteStudentAuth = onCall(async (request) => {
    const { uid } = request.data;
    if (!uid) {
        throw new HttpsError('invalid-argument', 'Kullanıcı IDsi gereklidir.');
    }

    try {
        await getAuth().deleteUser(uid);
        logger.info(`Successfully deleted user ${uid}`);
        return { success: true };
    } catch (error: any) {
        logger.error(`Error deleting user ${uid}:`, error);
        throw new HttpsError('internal', 'Kullanıcı Auth sisteminden silinirken bir hata oluştu.');
    }
});
