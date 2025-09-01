
'use strict';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

// Initialize Firebase Admin SDK
initializeApp();

/**
 * Creates a new student user in Firebase Authentication and a corresponding
 * document in the 'students' collection in Firestore.
 *
 * This function can only be called by an authenticated user who is an admin.
 * For now, admin status is checked via a hardcoded email.
 * TODO: In a production environment, this should be converted to use custom claims.
 */
export const createStudent = onCall(async (request) => {
  // Security Check: Ensure the caller is an authenticated admin.
  // This is a basic check. For production, use custom claims: `if (request.auth?.token.admin !== true)`
  if (request.auth?.token.email !== 'berkan_1225@hotmail.com') {
    throw new HttpsError(
      'permission-denied', 
      'Bu işlemi yapmak için yönetici yetkiniz yok.'
    );
  }

  const { email, password, name, className } = request.data;

  // Validate required fields
  if (!email || !password || !name) {
    throw new HttpsError(
      'invalid-argument', 
      'Lütfen tüm gerekli alanları doldurun (isim, e-posta, şifre).'
    );
  }

  try {
    // 1. Create user in Firebase Authentication
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Create user document in Firestore with default values
    const studentData = {
      name,
      email,
      className: className || '',
      weeklyQuestionGoal: 100, // Default weekly goal
      studySessions: [],
      assignments: [],
      resources: [],
      weeklyPlan: [],
      isPlanNew: false,
      unlockedAchievements: [],
      calendarEvents: [],
    };

    await getFirestore().collection('students').doc(userRecord.uid).set(studentData);

    return { success: true, message: 'Öğrenci başarıyla oluşturuldu.', uid: userRecord.uid };

  } catch (error: any) {
    console.error('Error creating new student:', error);

    // Provide a more specific error message to the client
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Bu e-posta adresi zaten kullanımda.');
    }
     if (error.code === 'auth/invalid-password') {
      throw new HttpsError('invalid-argument', 'Şifre en az 6 karakter olmalıdır.');
    }

    // For all other errors, throw a generic internal error
    throw new HttpsError('internal', 'Kullanıcı oluşturulurken bir sunucu hatası oluştu.', error.message);
  }
});
    