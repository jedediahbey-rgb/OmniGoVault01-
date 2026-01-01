/**
 * QA Review Mode Banner
 * Shows when a QA reviewer is logged in
 */

import React from 'react';
import { ShieldCheck } from '@phosphor-icons/react';

export function ReviewModeBanner({ user }) {
  // Only show for QA reviewer
  if (user?.role !== 'qa_reviewer' && user?.email !== 'qa.reviewer@omnigovault.test') {
    return null;
  }

  return (
    <div className="bg-yellow-600 text-black px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <ShieldCheck className="w-4 h-4" />
      STAGING QA REVIEW MODE - Read-only access for UX/QA audit
    </div>
  );
}

export default ReviewModeBanner;
