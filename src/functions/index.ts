
'use server';
/**
 * @fileOverview Firebase Cloud Functions.
 * This file contains the server-side logic for creating new users.
 */

import {onCall, HttpsError} from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK.
// It's safe to call this once per file.
initializeApp();

/**
 * Creates a new student user in Firebase Authentication.
 * This function only handles the auth creation part.
 * The Firestore document creation will be handled by the client.
 */
export const createStudent = onCall(async (request) => {
  // Ensure the caller is an authenticated admin.
  // IMPORTANT: For production, use custom claims for role management.
  // Using email for validation is a temporary measure for this specific project.
  if (request.auth?.token.email !== 'berkan_1225@hotmail.com') {
    logger.warn('Unauthorized user attempted to create a student.', {
      email: request.auth?.token.email || 'No email provided',
    });
    throw new HttpsError(
      'unauthenticated',
      'Bu işlemi yapmak için yönetici yetkiniz yok.'
    );
  }

  const {email, password, name, className} = request.data;

  // Validate required data
  if (!email || !password || !name) {
    throw new HttpsError(
      'invalid-argument',
      'E-posta, şifre ve isim alanları zorunludur.'
    );
  }
  if (password.length < 6) {
    throw new HttpsError(
      'invalid-argument',
      'Şifre en az 6 karakter olmalıdır.'
    );
  }

  try {
    // 1. Create the user in Firebase Authentication
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: name,
    });

    logger.info(`Successfully created auth user: ${userRecord.uid}`);

    const firestore = getFirestore();
    const batch = firestore.batch();

    // 2. Create the user role document in the 'users' collection
    const userDocRef = firestore.collection('users').doc(userRecord.uid);
    batch.set(userDocRef, {
      uid: userRecord.uid,
      email: email,
      role: 'student',
    });

    // 3. Create the student profile in the 'students' collection
    const studentDocRef = firestore.collection('students').doc(userRecord.uid);
    batch.set(studentDocRef, {
      id: userRecord.uid,
      name: name,
      email: email,
      className: className || '',
      weeklyQuestionGoal: 100,
      studySessions: [],
      assignments: [],
      resources: [],
      weeklyPlan: [],
      isPlanNew: false,
      unlockedAchievements: [],
      calendarEvents: [],
    });

    // 4. Commit the batch write
    await batch.commit();
    logger.info(`Successfully created Firestore documents for ${userRecord.uid}`);

    return {success: true, uid: userRecord.uid};
  } catch (error: any) {
    logger.error('Error during student creation process:', error);
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError(
        'already-exists',
        'Bu e-posta adresi zaten kullanımda.'
      );
    }
    // General internal error for any other issue
    throw new HttpsError(
      'internal',
      'Kullanıcı oluşturulurken beklenmedik bir sunucu hatası oluştu.'
    );
  }
});
