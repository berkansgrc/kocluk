
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
 */
export const createStudent = onCall(async (request) => {
  // Security Check 1: Ensure the caller is authenticated.
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated', 
      'Bu işlemi yapmak için giriş yapmalısınız.'
    );
  }

  // Security Check 2: Ensure the caller is an admin.
  if (request.auth.token.email !== 'berkan_1225@hotmail.com') {
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
  
  if (password.length < 6) {
      throw new HttpsError(
        'invalid-argument', 
        'Şifre en az 6 karakter olmalıdır.'
      );
  }

  let uid;

  try {
    // 1. Create user in Firebase Authentication
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: name,
    });
    uid = userRecord.uid;

    // 2. Create user document in Firestore with default values
    const studentData = {
      name,
      email,
      className: className || '', // Ensure className is not undefined
      weeklyQuestionGoal: 100,
      studySessions: [],
      assignments: [],
      resources: [],
      weeklyPlan: [],
      isPlanNew: false,
      unlockedAchievements: [],
      calendarEvents: [],
    };
    
    await getFirestore().collection('students').doc(uid).set(studentData);

    return { success: true, message: 'Öğrenci başarıyla oluşturuldu.', uid };

  } catch (error: any) {
    // If there was an error, and we managed to create an auth user,
    // we should delete it to clean up.
    if (uid) {
      await getAuth().deleteUser(uid);
    }
    
    // Log the detailed error to the console for debugging
    console.error('Error creating student:', error);

    // Provide a more specific error message to the client if possible
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Bu e-posta adresi zaten kullanımda.');
    }
    
    // For all other errors, throw a generic internal error.
    throw new HttpsError('internal', 'Öğrenci oluşturulurken beklenmedik bir sunucu hatası oluştu.');
  }
});


    