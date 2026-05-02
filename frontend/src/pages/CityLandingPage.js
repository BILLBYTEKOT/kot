import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { 
  ChefHat, 
  MapPin, 
  Star, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  ArrowRight,
  Phone,
  Mail,
  Clock,
  Award,
  Target,
  Zap
} from 'lucide-react';
import SEOMeta from '../components/seo/SEOMeta';
import SchemaManager from '../components/seo/SchemaManager';
import { cityData, getCityBySlug } from '../data/cityData';

/**
 * CityLandingPage Component
 * 
 * Dynamic city-specific landing pages for local SEO optimization.
 * Renders SEO-optimized pages for each city with local testimonials,
 * stats, and features sections.
 * 
 * @requirements 6.1, 6.2, 6.3
 */
const CityLandingPage = () => {
  const { citySlug } = useParams();
  const navigate = useNavigate();

  // Find city data by slug
  const cityKey = getCityBySlug(citySlug);
  const city = cityKey ? cityData[cityKey] : null;

  // Handle city not found
  if (!city) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">City Not Found</h1>
          <p className="text-gray-600 mb-6">
            We don't have information for this city yet.
          </p>
          <Button onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Generate breadcrumb data
  const breadcrumbData = {
    items: [
      { name: 'Home', url: 'https://billbytekot.in/' },
      { name: 'Cities', url: 'https://billbytekot.in/cities' },
      { name: city.name, url: `https://billbytekot.in/city/${city.slug}` }
    ]
  };

  // Generate local business schema data
  const localBusinessData = {
    name: `BillByteKOT - ${city.name}`,
    description: `Best restaurant billing software in ${city.name}, ${city.state}. Trusted by ${city.stats.restaurantCount}+ restaurants.`,
    businessType: 'SoftwareApplication',
    telephone: '+91-9353685739',
    email: 'support@billbytekot.in',
    url: `https://billbytekot.in/city/${city.slug}`,
    priceRange: 'â‚¹999-â‚¹4999',
    address: {
      city: city.name,
      state: city.state,
      country: 'IN'
    },
    aggregateRating: {
      ratingValue: city.stats.averageRating,
      reviewCount: city.stats.restaurantCount
    }
  };

  // Generate FAQ data for the city
  const cityFAQData = {
    questions: [
      {
        question: `What is the best KOT-first restaurant automation platform in ${city.name}?`,
        answer: `BillByteKOT is the leading KOT-first restaurant automation platform in ${city.name}, trusted by ${city.stats.restaurantCount}+ restaurants. It offers KOT system, thermal printing, GST billing, and WhatsApp integration at just â‚¹999/year.`
      },
      {
        question: `How much does restaurant POS software cost in ${city.name}?`,
        answer: `Restaurant POS software in ${city.name} typically costs â‚¹500-â‚¹5000/month. BillByteKOT offers the best value at just â‚¹999/year (â‚¹83/month) with all premium features included.`
      },
      {
        question: `Does BillByteKOT work offline in ${city.name}?`,
        answer: `Yes! BillByteKOT works completely offline in ${city.name}. Your restaurant can continue with KOT automation even during internet outages, with automatic sync when connection is restored.`
      },
      {
        question: `Is BillByteKOT GST compliant for ${city.state}?`,
        answer: `Absolutely! BillByteKOT is fully GST compliant for ${city.state} regulations. It generates proper GST invoices, maintains tax records, and helps with easy GST filing.`
      },
      {
        question: `What support is available for restaurants in ${city.name}?`,
        answer: `We provide 24/7 customer support for restaurants in ${city.name}. Our team offers phone support, live chat, remote assistance, and on-site training when needed.`
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      {/* SEO Meta Tags */}
      <SEOMeta
        title={city.title}
        description={city.description}
        keywords={city.keywords}
        canonicalUrl={`https://billbytekot.in/city/${city.slug}`}
        ogImage={`https://billbytekot.in/images/cities/${cityKey}-og.jpg`}
        ogType="website"
      />

      {/* Structured Data */}
      <SchemaManager type="BreadcrumbList" data={breadcrumbData} />
      <SchemaManager type="LocalBusiness" data={localBusinessData} />
      <SchemaManager type="FAQPage" data={cityFAQData} />

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                BillByteKOT
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/login')}>
                Login
              </Button>
              <Button onClick={() => navigate('/login')}>
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-violet-50 to-purple-50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Location Badge */}
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm mb-6">
              <MapPin className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-medium text-gray-700">
                {city.name}, {city.state}
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Best Restaurant Billing Software in{' '}
              <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                {city.name}
              </span>
            </h1>

            {/* Description */}
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Trusted by {city.stats.restaurantCount}+ restaurants in {city.name}. 
              Complete KOT system, thermal printing, GST billing & WhatsApp integration. 
              Starting at just â‚¹999/year.
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap justify-center gap-8 mb-10">
              <div className="text-center">
                <div className="text-3xl font-bold text-violet-600">
                  {city.stats.restaurantCount}+
                </div>
                <div className="text-sm text-gray-600">Restaurants</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-3xl font-bold text-violet-600">
                    {city.stats.averageRating}
                  </span>
                  <Star className="w-6 h-6 text-yellow-400 fill-current" />
                </div>
                <div className="text-sm text-gray-600">Average Rating</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-violet-600">
                  {city.stats.averageSavings}
                </div>
                <div className="text-sm text-gray-600">Avg. Savings/Year</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 h-12 px-8"
                onClick={() => navigate('/login')}
              >
                Start 7-Day Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-12 px-8"
                onClick={() => navigate('/demo')}
              >
                Watch Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 text-sm text-gray-500">
              âœ“ No Credit Card Required âœ“ 7-Day Free Trial âœ“ 24/7 Support
            </div>
          </div>
        </div>
      </section>

      {/* Local Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Built for {city.name} Restaurants
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Specially designed features for {city.name}'s unique restaurant ecosystem
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {city.localFeatures.map((feature, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-gray-700 font-medium">{feature}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                What {city.name} Restaurant Owners Say
              </h2>
              <p className="text-xl text-gray-600">
                Real reviews from successful restaurants in {city.name}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {city.testimonials.map((testimonial, index) => (
                <Card key={index} className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    {/* Rating Stars */}
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                      ))}
                    </div>

                    {/* Quote */}
                    <blockquote className="text-gray-700 mb-6 italic">
                      "{testimonial.quote}"
                    </blockquote>

                    {/* Author */}
                    <div className="flex items-center gap-3">
                      <img 
                        src={testimonial.image} 
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=7c3aed&color=fff`;
                        }}
                      />
                      <div>
                        <div className="font-semibold text-gray-900">
                          {testimonial.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {testimonial.restaurant}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Popular Restaurant Types */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Perfect for All {city.name} Restaurant Types
              </h2>
              <p className="text-xl text-gray-600">
                From street food to fine dining - we've got you covered
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {city.popularRestaurantTypes.map((type, index) => (
                <div 
                  key={index}
                  className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 text-center hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <ChefHat className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-sm font-medium text-gray-700">
                    {type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Key Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Why {city.name} Restaurants Choose BillByteKOT
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Increase Revenue</h3>
                <p className="text-gray-600">
                  Faster billing and better inventory management boost profits by 25%
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Save Time</h3>
                <p className="text-gray-600">
                  Automated KOT system reduces order processing time by 60%
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Reduce Errors</h3>
                <p className="text-gray-600">
                  Digital KOT eliminates 80% of order mistakes and kitchen confusion
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Happy Customers</h3>
                <p className="text-gray-600">
                  Faster service and accurate orders improve customer satisfaction
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nearby Areas */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Serving Restaurants Across {city.name}
              </h2>
              <p className="text-xl text-gray-600">
                We support restaurants in all major areas of {city.name}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {city.nearbyAreas.map((area, index) => (
                <div 
                  key={index}
                  className="bg-gray-50 rounded-lg p-4 text-center hover:bg-violet-50 transition-colors"
                >
                  <MapPin className="w-5 h-5 text-violet-600 mx-auto mb-2" />
                  <div className="text-sm font-medium text-gray-700">
                    {area}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-violet-600 to-purple-600">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Transform Your {city.name} Restaurant?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join {city.stats.restaurantCount}+ successful restaurants in {city.name}. 
              Start your 7-day free trial today - no credit card required!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg" 
                className="bg-white text-violet-600 hover:bg-gray-100 h-12 px-8"
                onClick={() => navigate('/login')}
              >
                Start Free Trial Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-violet-600 h-12 px-8"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call +91-9353685739
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm opacity-90">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>7-Day Free Trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>No Setup Fee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>24/7 Support</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Cancel Anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Need Help? We're Here for {city.name} Restaurants
              </h2>
              <p className="text-gray-600">
                Our local support team understands {city.name}'s restaurant industry
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Call Us</h3>
                <p className="text-gray-600">+91-9353685739</p>
                <p className="text-sm text-gray-500">24/7 Support Available</p>
              </div>

              <div>
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Email Us</h3>
                <p className="text-gray-600">support@billbytekot.in</p>
                <p className="text-sm text-gray-500">Quick Response Guaranteed</p>
              </div>

              <div>
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
                <p className="text-gray-600">Available 24/7</p>
                <p className="text-sm text-gray-500">Instant Help & Guidance</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              {/* Brand */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold">BillByteKOT</span>
                </div>
                <p className="text-gray-400 text-sm">
                  The most trusted restaurant billing software in {city.name}. 
                  Empowering restaurants with smart technology.
                </p>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="font-semibold mb-4">Quick Links</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><Link to="/features" className="hover:text-white">Features</Link></li>
                  <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
                  <li><Link to="/demo" className="hover:text-white">Demo</Link></li>
                  <li><Link to="/support" className="hover:text-white">Support</Link></li>
                </ul>
              </div>

              {/* Cities */}
              <div>
                <h4 className="font-semibold mb-4">Other Cities</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><Link to="/city/restaurant-billing-software-mumbai" className="hover:text-white">Mumbai</Link></li>
                  <li><Link to="/city/restaurant-billing-software-delhi" className="hover:text-white">Delhi</Link></li>
                  <li><Link to="/city/restaurant-billing-software-bangalore" className="hover:text-white">Bangalore</Link></li>
                  <li><Link to="/city/restaurant-billing-software-pune" className="hover:text-white">Pune</Link></li>
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h4 className="font-semibold mb-4">Contact</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>ðŸ“ž +91-9353685739</li>
                  <li>âœ‰ï¸ support@billbytekot.in</li>
                  <li>ðŸŒ billbytekot.in</li>
                  <li>ðŸ“ Serving {city.name} & Beyond</li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
              <p>Â© 2025 BillByteKOT by BillByte Innovations. All rights reserved.</p>
              <p className="mt-2">
                Proudly serving restaurants in {city.name}, {city.state} and across India.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CityLandingPage;
