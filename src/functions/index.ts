
/**
 * @fileoverview Firebase Functions for user and student management.
 */

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

// Initialize Firebase Admin SDK
initializeApp();

/**
 * A callable function for admins to create a new student user.
 *
 * This function performs the following actions atomically:
 * 1. Checks if the caller is an admin.
 * 2. Creates a new user in Firebase Authentication.
 * 3. Creates a corresponding user role document in the `/users` collection.
 * 4. Creates a corresponding student profile document in the `/students` collection.
 */
export const createStudent = onCall(async (request) => {
  // 1. Authenticate and Authorize the caller
  if (request.auth?.token.email !== "berkan_1225@hotmail.com") {
    throw new HttpsError(
      "permission-denied",
      "Bu işlemi gerçekleştirmek için admin yetkiniz bulunmamaktadır."
    );
  }

  // 2. Validate incoming data
  const { name, email, password, className } = request.data;
  if (!name || !email || !password) {
    throw new HttpsError(
      "invalid-argument",
      "İsim, e-posta ve şifre alanları zorunludur."
    );
  }
  if (password.length < 6) {
    throw new HttpsError(
        "invalid-argument",
        "Şifre en az 6 karakter olmalıdır."
    );
  }

  const auth = getAuth();
  const db = getFirestore();

  let newUserRecord;
  try {
    // 3. Create user in Firebase Authentication
    newUserRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });
  } catch (error: any) {
    // Handle specific auth errors
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError(
        "already-exists",
        "Bu e-posta adresi zaten kullanımda."
      );
    }
    console.error("Error creating user in Auth:", error);
    throw new HttpsError("internal", "Kullanıcı oluşturulurken bir hata oluştu.");
  }

  const uid = newUserRecord.uid;

  try {
    // 4. Use a batch write for atomic operation in Firestore
    const batch = db.batch();

    // Create document in 'users' collection
    const userDocRef = db.collection("users").doc(uid);
    batch.set(userDocRef, {
      uid,
      email,
      role: "student",
    });

    // Create document in 'students' collection
    const studentDocRef = db.collection("students").doc(uid);
    batch.set(studentDocRef, {
      id: uid,
      name,
      email,
      className: className || "", // Default to empty string if not provided
      weeklyQuestionGoal: 100, // Sensible default
      studySessions: [],
      assignments: [],
      resources: [],
      weeklyPlan: [],
      isPlanNew: false,
      unlockedAchievements: [],
      calendarEvents: [],
    });

    await batch.commit();

    return { success: true, message: "Öğrenci başarıyla oluşturuldu.", uid };
  } catch (error) {
    // If Firestore write fails, delete the created Auth user to prevent orphans
    console.error("Error writing to Firestore, rolling back Auth user:", error);
    await auth.deleteUser(uid);
    throw new HttpsError(
      "internal",
      "Veritabanına kayıt sırasında bir hata oluştu. Kullanıcı oluşturma işlemi geri alındı."
    );
  }
});
