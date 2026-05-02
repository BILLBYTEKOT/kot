import { useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { 
  HelpCircle, MessageCircle, Mail, Phone, Book, Video, 
  FileText, Search, Send, Sparkles, CheckCircle, Clock,
  Zap, Users, CreditCard, Printer, BarChart3, Settings
} from 'lucide-react';
import axios from 'axios';
import { API } from '../App';

const HelpPage = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [sending, setSending] = useState(false);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    
    try {
      await axios.post(`${API}/contact`, contactForm);
      toast.success('Message sent! We\'ll get back to you soon.');
      setContactForm({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const faqs = [
    {
      category: 'Getting Started',
      icon: Zap,
      color: 'violet',
      questions: [
        {
          q: 'How do I create my first bill?',
          a: 'Go to Orders â†’ New Order, select a table, add items from your menu, and click "Create Order". Then go to Billing to complete the payment.'
        },
        {
          q: 'How do I add menu items?',
          a: 'Navigate to Menu page, click "Add Item", fill in the details (name, price, category), and save. You can also bulk upload items via CSV.'
        },
        {
          q: 'How do I add staff members?',
          a: 'Go to Settings â†’ Staff Management, click "Add Staff", enter their details, assign a role (Waiter, Cashier, Kitchen), and save.'
        }
      ]
    },
    {
      category: 'Billing & Payments',
      icon: CreditCard,
      color: 'green',
      questions: [
        {
          q: 'What payment methods are supported?',
          a: 'We support Cash, Card, UPI, and Razorpay integration. You can configure your Razorpay account in Settings.'
        },
        {
          q: 'How do I print thermal receipts?',
          a: 'After completing payment, click the Print button. Make sure your thermal printer is connected and configured in Settings â†’ Printer.'
        },
        {
          q: 'Can I apply discounts?',
          a: 'Yes! In the billing page, you can apply percentage or fixed amount discounts before completing the payment.'
        }
      ]
    },
    {
      category: 'Reports & Analytics',
      icon: BarChart3,
      color: 'blue',
      questions: [
        {
          q: 'How do I export reports?',
          a: 'Go to Reports page, select your date range, and click on CSV, Excel, or PDF export buttons. You can also print reports directly.'
        },
        {
          q: 'What reports are available?',
          a: 'Daily, Weekly, Monthly sales reports, Best-selling items, Staff performance, Peak hours analysis, and AI-powered forecasts.'
        },
        {
          q: 'How do I track inventory?',
          a: 'Go to Inventory page to add items, set minimum quantities, and track stock levels. The system auto-deducts inventory when orders are completed.'
        }
      ]
    },
    {
      category: 'Subscription & Pricing',
      icon: CheckCircle,
      color: 'orange',
      questions: [
        {
          q: 'How does the free trial work?',
          a: 'You get 7 days of full access to all premium features, completely free. No credit card required.'
        },
        {
          q: 'What happens after the trial?',
          a: 'After 7 days, subscribe for â‚¹999/year to continue using all features. You can also use coupon codes for discounts!'
        },
        {
          q: 'Do you have discount codes?',
          a: 'Yes! Try LAUNCH50 (50% off), WELCOME25 (25% off), SAVE100 (â‚¹100 off), EARLYBIRD (30% off), or FIRSTYEAR (40% off).'
        }
      ]
    },
    {
      category: 'Technical Support',
      icon: Settings,
      color: 'red',
      questions: [
        {
          q: 'My thermal printer is not working',
          a: 'Check: 1) Printer is connected and powered on, 2) Correct printer selected in Settings, 3) Paper is loaded, 4) Try test print from Settings.'
        },
        {
          q: 'How do I backup my data?',
          a: 'Your data is automatically backed up to the cloud. You can also export reports regularly as CSV/Excel for local backup.'
        },
        {
          q: 'Can I use this on multiple devices?',
          a: 'Yes! BillByteKOT works on any device with a web browser. Your data syncs automatically across all devices.'
        }
      ]
    }
  ];

  const quickLinks = [
    { icon: Book, title: 'User Guide', desc: 'Complete documentation', link: '/blog' },
    { icon: Video, title: 'Video Tutorials', desc: 'Watch how-to videos', link: '/blog' },
    { icon: FileText, title: 'API Docs', desc: 'For developers', link: '/blog' },
    { icon: MessageCircle, title: 'Contact Support', desc: 'Get help from our team', link: '/contact' }
  ];

  const filteredFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(q => 
      searchQuery === '' || 
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  return (
    <Layout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-100 rounded-full mb-4">
            <HelpCircle className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-medium text-violet-600">Help Center</span>
          </div>
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            How can we help you?
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Find answers to common questions, browse guides, or contact our support team
          </p>
        </div>

        {/* Search */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search for help... (e.g., 'how to print receipt')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((link, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer" onClick={() => window.location.href = link.link}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <link.icon className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{link.title}</h3>
                <p className="text-sm text-gray-500">{link.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQs */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          
          {filteredFaqs.map((category, catIndex) => (
            <Card key={catIndex} className="border-0 shadow-lg">
              <CardHeader className={`bg-gradient-to-r from-${category.color}-50 to-${category.color}-100`}>
                <CardTitle className="flex items-center gap-2">
                  <category.icon className={`w-5 h-5 text-${category.color}-600`} />
                  {category.category}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {category.questions.map((faq, qIndex) => (
                    <div key={qIndex} className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-bold text-gray-900 mb-2 flex items-start gap-2">
                        <HelpCircle className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                        {faq.q}
                      </h4>
                      <p className="text-gray-600 text-sm ml-7">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Contact Form */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-violet-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-violet-600" />
              Still need help? Contact us
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
                  <Input
                    value={contactForm.name}
                    onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                    required
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                    required
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Subject</label>
                <Input
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                  required
                  placeholder="What do you need help with?"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Message</label>
                <Textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                  required
                  placeholder="Describe your issue or question..."
                  rows={5}
                />
              </div>
              <Button 
                type="submit" 
                disabled={sending}
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600"
              >
                {sending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold mb-1">Email Support</h3>
              <p className="text-sm text-gray-600">support@billbytekot.in</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => window.open('https://wa.me/919353685739?text=Hi, I need help with BillByteKOT', '_blank')}>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-bold mb-1">WhatsApp Support</h3>
              <p className="text-sm text-gray-600">+91 83108 32669</p>
              <p className="text-xs text-green-600 mt-1">Click to chat â†’</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-bold mb-1">Support Hours</h3>
              <p className="text-sm text-gray-600">Mon-Sat, 9 AM - 6 PM IST</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default HelpPage;

