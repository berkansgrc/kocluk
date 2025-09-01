/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
initializeApp();

export const createStudent = onCall(async (request) => {
  // Check if the caller is authenticated and an admin.
  // Using a custom claim for 'admin' is the recommended security practice.
  // For this project, we check the email as per the requirements.
  if (request.auth?.token.email !== "berkan_1225@hotmail.com") {
    logger.warn("Unauthorized user tried to create a student.", {
      email: request.auth?.token.email,
    });
    throw new HttpsError(
      "unauthenticated",
      "Bu işlemi yapmak için yönetici yetkiniz yok.",
    );
  }

  // Validate incoming data
  const {email, password, name, className} = request.data;
  if (!email || !password || !name) {
    throw new HttpsError(
      "invalid-argument",
      "E-posta, şifre ve isim alanları zorunludur.",
    );
  }
  if (password.length < 6) {
    throw new HttpsError(
      "invalid-argument",
      "Şifre en az 6 karakter olmalıdır.",
    );
  }

  let newUserRecord;
  try {
    // Step 1: Create the user in Firebase Authentication
    newUserRecord = await getAuth().createUser({
      email: email,
      password: password,
      displayName: name,
    });
    logger.info("Successfully created new user:", newUserRecord.uid);
  } catch (error: any) {
    logger.error("Error creating new user in Auth:", error);
    // Provide a more specific error message to the client
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError(
        "already-exists",
        "Bu e-posta adresi zaten kullanımda.",
      );
    }
    throw new HttpsError("internal", "Yeni kullanıcı oluşturulamadı.");
  }

  try {
    const firestore = getFirestore();
    const batch = firestore.batch();

    // Step 2: Create the user role document in the 'users' collection
    const userDocRef = firestore.collection("users").doc(newUserRecord.uid);
    batch.set(userDocRef, {
      uid: newUserRecord.uid,
      email: email,
      role: "student",
    });

    // Step 3: Create the student profile in the 'students' collection
    const studentDocRef = firestore.collection("students").doc(newUserRecord.uid);
    batch.set(studentDocRef, {
      id: newUserRecord.uid,
      name: name,
      email: email,
      className: className || "", // Default to empty string if not provided
      weeklyQuestionGoal: 100, // Default value
      studySessions: [],
      assignments: [],
      resources: [],
      weeklyPlan: [],
      isPlanNew: false,
      unlockedAchievements: [],
      calendarEvents: [],
    });

    // Step 4: Commit the batch write
    await batch.commit();
    logger.info(`Successfully created documents for user ${newUserRecord.uid}`);

    return {success: true, uid: newUserRecord.uid};
  } catch (error) {
    logger.error(
      `Error creating Firestore documents for user ${newUserRecord.uid}:`,
      error,
    );
    // If Firestore write fails, delete the created Auth user to maintain consistency
    await getAuth().deleteUser(newUserRecord.uid);
    logger.warn(`Deleted orphaned Auth user ${newUserRecord.uid}`);
    throw new HttpsError(
      "internal",
      "Veritabanı kaydı oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
    );
  }
});
