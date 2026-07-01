import { useState } from "react";
import { X, Phone, Mail, CheckCircle, Smartphone, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import axios from "axios";
import { toast } from "sonner";

// Play Store link
const PLAY_STORE_URL = "https://shorturl.at/CLDN3";

const MobileAppLeadPopup = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1); // 1: form, 2: redirecting
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    businessName: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Require phone number
    if (!formData.phone) {
      toast.error("Please enter your phone number");
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL || window.location.origin}/api/leads`, {
        ...formData,
        source: "play_store_download",
        timestamp: new Date().toISOString(),
      });
      
      // Show success and redirect to Play Store
      setStep(2);
      toast.success("Redirecting to Play Store...");
      
      // Redirect to Play Store after 2 seconds
      setTimeout(() => {
        window.open(PLAY_STORE_URL, '_blank');
        handleClose();
      }, 2000);
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleClose = () => {
    setStep(1);
    setFormData({ name: "", phone: "", email: "", businessName: "" });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in duration-300 overflow-hidden">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
          
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur rounded-2xl mb-4">
              <Smartphone className="w-8 h-8" />
            </div>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-sm font-medium mb-3">
              <Sparkles className="w-4 h-4" />
              Now on Play Store
            </div>
            <h2 className="text-2xl font-black">
              Download BillByteKOT
            </h2>
            <p className="text-white/80 mt-2 text-sm">
              Get the app from Google Play Store
            </p>
          </div>
        </div>

        {step === 1 ? (
          // Step 1: Phone Number Collection
          <div className="p-6">
            <p className="text-gray-600 text-center mb-6">
              Enter your phone number to download the app from Play Store
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  className="w-full h-11"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="w-full pl-10 h-11"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Restaurant Name (Optional)
                </label>
                <Input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="Your restaurant name"
                  className="w-full h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 text-lg font-bold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  <>
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Continue to Play Store
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500">
                You'll be redirected to Google Play Store
              </p>
            </form>
          </div>
        ) : (
          // Step 2: Redirecting Message
          <div className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4 animate-pulse">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Redirecting to Play Store... 🚀
            </h2>
            <p className="text-gray-600 mb-6">
              Opening Google Play Store in a new tab
            </p>

            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-gray-900 mb-3">
                After installing:
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Open the app and sign up</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Start your 7-day free trial</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>No credit card required</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={() => window.open(PLAY_STORE_URL, '_blank')}
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 mb-2"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Open Play Store Now
            </Button>
            
            <Button
              onClick={handleClose}
              variant="outline"
              className="w-full h-10"
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileAppLeadPopup;
