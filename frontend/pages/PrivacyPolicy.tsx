import React from 'react';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const PrivacyPolicy: React.FC = () => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
    >
      <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
      <p className="text-sm text-slate-400 mb-8">Last updated: August 28, 2024</p>

      <div className="space-y-6 text-slate-300">
        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">1. Information We Collect</h2>
          <ul className="list-disc list-inside space-y-2">
              <li><strong>Personal Data:</strong> When you register, we collect information such as your name, email address, and payment details.</li>
              <li><strong>FPL Data:</strong> We access your Fantasy Premier League team ID to track your points and league performance.</li>
              <li><strong>Transaction Data:</strong> We maintain a record of your deposits, withdrawals, and league entries.</li>
              <li><strong>Usage Data:</strong> We may collect information about how you access and use the Service, including your IP address and browser type.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
          <p>
            We use the information we collect to operate and maintain our Service, process transactions, communicate with you, monitor and analyze usage, and to detect and prevent technical issues and fraud.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">3. Data Sharing</h2>
          <p>
            We do not sell your personal information. We may share your data with trusted third-party service providers who assist us in operating our platform, such as payment processors. We may also disclose your information where required by law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">4. Data Security</h2>
          <p>
            We implement a variety of security measures to maintain the safety of your personal information. However, no method of transmission over the Internet or method of electronic storage is 100% secure.
          </p>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">5. Your Rights</h2>
          <p>
            You have the right to access, update, or delete your personal information. You can manage your information through your profile settings page or by contacting our support team.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">6. Changes to This Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
          </p>
        </section>
      </div>
    </motion.div>
  );
};

export default PrivacyPolicy;