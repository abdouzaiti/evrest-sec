import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

export function Layout() {
  const { isRTL } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-primary/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300 w-full",
        isRTL ? "lg:mr-64" : "lg:ml-64"
      )}>
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="p-4 md:p-8 w-full overflow-hidden"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
