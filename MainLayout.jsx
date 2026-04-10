const MainLayout = ({ children, currentPage, setCurrentPage, userProfile, handleLogout, notifications, isNotiOpen, setIsNotiOpen, isSidebarOpen, setIsSidebarOpen, favorites, toggleFavorite, handleNotiClick, handleMarkAllAsRead, setSelfEditTarget }) => {
    return (
        <div className="flex h-screen overflow-hidden bg-letusBg text-gray-900 font-sans">
            {/* 1. 사이드바 (고정) */}
            <Sidebar
                page={currentPage}
                setPage={setCurrentPage}
                userProfile={userProfile}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                favorites={favorites}
            />

            {/* 2. 본문 컨테이너 */}
            <div className="flex-1 flex flex-col w-full bg-slate-100 overflow-hidden min-h-screen relative">

                {/* 3. 상단 헤더 (고정) */}
                <Header
                    page={currentPage}
                    userProfile={userProfile}
                    onLogout={handleLogout}
                    notifications={notifications}
                    isNotiOpen={isNotiOpen}
                    toggleNoti={() => setIsNotiOpen(!isNotiOpen)}
                    onNotiClick={handleNotiClick}
                    onEditProfile={() => setSelfEditTarget(userProfile)}
                    favorites={favorites}
                    toggleFavorite={toggleFavorite}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    onMarkAllRead={handleMarkAllAsRead}
                />

                {/* 4. 실제 메뉴 내용이 들어가는 스크롤 영역 */}
                <main className="flex-1 w-full overflow-auto custom-scrollbar">
                    {children}
                </main>
            </div>
        </div>
    );
};

window.MainLayout = MainLayout;