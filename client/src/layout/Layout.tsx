import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Layout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="app">
      <Header />
      <main className="app-main">
        {children}
      </main>
      <Footer />
    </div>
  );
}
