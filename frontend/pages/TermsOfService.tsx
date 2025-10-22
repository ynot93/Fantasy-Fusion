import React from 'react';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const TermsOfService: React.FC = () => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
    >
      <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
      <p className="text-sm text-slate-400 mb-8">Last updated: August 28, 2024</p>

      <div className="space-y-6 text-slate-300">
        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using FPL Nexus Leagues ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, then you may not access the Service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">2. Eligibility</h2>
          <p>
            You must be at least 18 years of age to use our Service. By creating an account, you represent and warrant that you meet this age requirement and that you will not use the Service for any illegal or unauthorized purpose.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">3. User Accounts</h2>
          <p>
            You are responsible for safeguarding your account information. You agree to notify us immediately of any unauthorized use of your account. Each individual is permitted to have only one account. Multiple accounts for a single user are strictly prohibited and may result in the termination of all associated accounts.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">4. Payments, Winnings, and Payouts</h2>
          <p>
            All league entry fees are non-refundable once the gameweek begins. The prize pool for each league is calculated based on the total entry fees collected, less a 10% service fee. This fee covers operational costs, payment processing, and platform maintenance. Winnings will be credited to your account wallet and can be withdrawn subject to our withdrawal policy. You are solely responsible for any taxes applicable to your winnings.
          </p>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">5. Prohibited Conduct</h2>
          <p>
            You agree not to engage in any of the following prohibited activities: cheating, collusion, using automated scripts or bots, exploiting bugs, or any form of fraudulent activity. Violation of these rules will result in immediate account termination and forfeiture of any funds.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">6. Disclaimers</h2>
          <p>
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. FPL Nexus Leagues is not affiliated with the official Fantasy Premier League (FPL) or the Premier League. We do not guarantee the accuracy or timeliness of FPL data.
          </p>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">7. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any significant changes. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.
          </p>
        </section>
      </div>
    </motion.div>
  );
};

export default TermsOfService;