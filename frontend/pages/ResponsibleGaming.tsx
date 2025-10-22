import React from 'react';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const ResponsibleGaming: React.FC = () => {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto"
    >
      <h1 className="text-4xl font-bold text-white mb-4">Responsible Gaming Policy</h1>
      <p className="text-sm text-slate-400 mb-8">Your well-being is our priority.</p>

      <div className="space-y-6 text-slate-300">
        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">Our Commitment</h2>
          <p>
            FPL Nexus Leagues is committed to providing a fun and entertaining fantasy sports experience while promoting a safe and responsible gaming environment. We want our users to play within their means and for the right reasons.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">Tips for Playing Responsibly</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Play for entertainment, not as a source of income.</li>
            <li>Only play with money you can afford to lose.</li>
            <li>Set a budget for your spending and stick to it.</li>
            <li>Balance fantasy sports with other activities.</li>
            <li>Never chase your losses.</li>
            <li>Understand the game and the risks involved.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">Setting Limits</h2>
          <p>
            We encourage all users to manage their play. In your account settings, you can find tools to set limits on your deposits and league entries on a daily, weekly, or monthly basis.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">Self-Exclusion</h2>
          <p>
            If you feel you need to take a break from playing, you can request a "cool-off" period or self-exclusion by contacting our support team. This will temporarily or permanently block access to your account.
          </p>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">Getting Help</h2>
          <p>
            If you or someone you know has a gambling problem, help is available. We recommend seeking support from organizations like Gamblers Anonymous or other local support services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white mb-3">Age Verification</h2>
          <p>
            We strictly enforce our policy that prohibits individuals under the age of 18 from playing on our platform. We perform age verification checks to ensure compliance.
          </p>
        </section>
      </div>
    </motion.div>
  );
};

export default ResponsibleGaming;