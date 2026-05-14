import React from "react";
import "./Learnmore.css";

const StepsSection = () => {
  return (
    <>
      <div className="steps-wrapper text-center py-5">
        <div className="container">
          <h1 className="main-title mb-3">
            How To Use Our Advanced AI Prediction Tool
          </h1>

          <p className="description mx-auto mb-5">
            <span className="line line1">
              Heart Diseases Are Very Dangerous So If You Want To Take Care Of Your
            </span>

            <span className="line line2">
              Heart Follow The Following Steps To Make Sure That You Get The
            </span>

            <span className="line line3">
              Most Benefit From Our Site.
            </span>
          </p>

          <div className="row justify-content-center g-4">
            {/* CARD 1 */}
            <div className="col-md-3 d-flex justify-content-center">
              <div className="step-card step-card-1">
                <div className="step-circle">1</div>

                <h5>First Step</h5>
                <h6>Check Up</h6>

                <p>
                  You Should Check Your Heart Care Always To Take Care Of Your
                  Health And You Should Do That With The Right Way
                </p>
              </div>
            </div>

            {/* CARD 2 */}
            <div className="col-md-6 d-flex justify-content-center">
              <div className="step-card step-card-2">
                <div className="step-circle">2</div>

                <h5>Second Step</h5>
                <h6>The Labs</h6>

                <p>
                  You Should Go To A Specialized And Trusted Labs To Check
                  Your Heart Care And It Is Suggested Doing The Check Up
                  And Examination Under Medical Supervision
                </p>
              </div>
            </div>

            {/* CARD 3 */}
            <div className="col-md-3 d-flex justify-content-center">
              <div className="step-card step-card-3">
                <div className="step-circle">3</div>

                <h5>Third Step</h5>
                <h6>The Medical Report</h6>

                <p>
                  After Finishing Your Tests And Examinations In The Lab,
                  The Lab Will Send The Report File To Our System,
                  Then You Can Start Prediction
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="steps-wrapper ecg-learnmore-section text-center py-5">
        <div className="container">
          <h2 className="main-title mb-3">
            How To Use Our ECG AI Analysis
          </h2>

          <p className="description mx-auto mb-5">
            <span className="line line1">
              Your Electrocardiogram (ECG) Can Be Analyzed By Our Deep Learning Model
            </span>

            <span className="line line2">
              After Your Lab Uploads The Recording. Follow These Steps To Understand
            </span>

            <span className="line line3">
              The Journey From Signal To Insight On Our Platform.
            </span>
          </p>

          <div className="row justify-content-center g-4">
            <div className="col-md-3 d-flex justify-content-center">
              <div className="step-card step-card-1">
                <div className="step-circle">1</div>

                <h5>First Step</h5>
                <h6>ECG Recording</h6>

                <p>
                  Have Your 12-Lead ECG Recorded At A Qualified Lab Or Clinic Under
                  Medical Supervision. A Good Quality Trace Is The Foundation For
                  Reliable Automated Analysis.
                </p>
              </div>
            </div>

            <div className="col-md-6 d-flex justify-content-center">
              <div className="step-card step-card-2">
                <div className="step-circle">2</div>

                <h5>Second Step</h5>
                <h6>Lab Upload (WFDB)</h6>

                <p>
                  Your Lab Links The ECG To Your Account And Uploads The Standard WFDB
                  Pair (Header And Signal Files). Once The Files Are In Our System,
                  They Are Ready For Secure Processing By The AI Service.
                </p>
              </div>
            </div>

            <div className="col-md-3 d-flex justify-content-center">
              <div className="step-card step-card-3">
                <div className="step-circle">3</div>

                <h5>Third Step</h5>
                <h6>AI Results &amp; Chart</h6>

                <p>
                  Open The ECG Section In Your Dashboard To Run Or Refresh Analysis.
                  You Will See Top Predictions, A Probability Chart, And Supporting
                  Text To Discuss With Your Doctor—Not A Substitute For Clinical Care.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default StepsSection;