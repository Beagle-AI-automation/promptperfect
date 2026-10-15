'use client';

import { useEffect, useState } from 'react';
import { PromptInput } from '@/components/PromptInput';
import { StreamingPromptOutput } from '@/components/StreamingPromptOutput';
import { ExplanationPanel } from '@/components/ExplanationPanel';
import { HistoryPanel } from '@/components/HistoryPanel';
import { optimizedTextFromFullCompletion } from '@/lib/client/optimizationHistory';
import { RunActions } from '@/components/workspace/RunActions';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { OptimizeControls } from '@/components/workspace/OptimizeControls';
import { TranslateButton } from '@/components/TranslateButton';
import { StatsBar } from '@/components/StatsBar';
import { AppSettingsPanel } from '@/components/AppSettingsPanel';
import { DemoLimitModal } from '@/components/DemoLimitModal';
import { SignInRequiredModal } from '@/components/SignInRequiredModal';
import { useWorkspaceSession } from '@/hooks/useWorkspaceSession';
import { useOptimizeRunner } from '@/hooks/useOptimizeRunner';
import { userFacingOptimizeError } from '@/lib/optimizeUserError';
import { ClientErrorBoundary } from '@/components/ClientErrorBoundary';

export default function AppPage() {
  const {
    mounted,
    hydrated,
    user,
    provider,
    setProvider,
    apiKey,
    setApiKey,
    signingOut,
    handleLogout,
  } = useWorkspaceSession();

  const runner = useOptimizeRunner({ user, provider, apiKey, mounted, hydrated });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);

  useEffect(() => {
    const open = () => setSettingsOpen(true);
    document.addEventListener('open-settings', open);
    return () => document.removeEventListener('open-settings', open);
  }, []);

  if (!mounted || !hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505]">
        <div className="text-[#ECECEC]">Loading…</div>
      </div>
    );
  }

  const {
    inputText,
    setInputText,
    selectedMode,
    setSelectedMode,
    explanation,
    setExplanation,
    completion,
    isLoading,
    error,
    sessionId,
    historyId,
    runMeta,
    inLibrary,
    setInLibrary,
    statsRefresh,
    historyRefresh,
    selectedHistoryItem,
    showLimitModal,
    setShowLimitModal,
    usageGateError,
    guestUsageVersion,
    thumbOptimistic,
    handleOptimize,
    resetComposerToNewPrompt,
    handleProjectDigest,
    handleRemediate,
    handleTranslateOutput,
    handleHistorySelect,
    handleHistoryDeleted,
    handleStatsThumbsSynced,
    handleFeedbackSubmitted,
    refreshStats,
  } = runner;

  return (
    <div
      className={`relative flex min-h-screen w-full flex-col bg-[#050505] font-sans${user ? ' md:pr-72' : ''}`}
    >
      <WorkspaceHeader
        user={user}
        signingOut={signingOut}
        onOpenSettings={() => setSettingsOpen(true)}
        onRequireSignIn={() => setShowSignInModal(true)}
        onLogout={() => void handleLogout()}
      />

      <main className="smooth-scroll mt-14 flex min-h-0 w-full flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {user && (
          <div className="shrink-0 px-6 pt-5">
            <StatsBar
              refreshTrigger={statsRefresh}
              cacheUserId={user.id}
              optimisticThumbs={thumbOptimistic}
              onStatsFetched={handleStatsThumbsSynced}
            />
          </div>
        )}

        {/* Optimize area — wrapped in ClientErrorBoundary for resilient UI recovery */}
        <ClientErrorBoundary>
        {/* Two-column textarea section: row on large screens, normal flow, no overlap */}
        <div className="flex w-full flex-col gap-5 px-6 pb-0 pt-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <PromptInput
              variant="optimizer"
              value={inputText}
              onChange={setInputText}
              disabled={isLoading}
            />
            <div className="mt-2 flex justify-end">
              <TranslateButton
                text={inputText}
                onTranslated={(t) => setInputText(t)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <StreamingPromptOutput
              variant="optimizer"
              text={completion}
              isStreaming={isLoading}
              onExplanation={setExplanation}
              afterTextarea={
                completion && !isLoading ? (
                  <RunActions
                    historyId={historyId}
                    userId={user?.id ?? null}
                    sessionId={sessionId}
                    inputText={inputText}
                    optimized={optimizedTextFromFullCompletion(completion)}
                    fullText={completion}
                    explanation={explanation}
                    mode={runMeta?.mode ?? selectedMode}
                    provider={runMeta?.provider ?? provider}
                    inputLength={runMeta?.inputLength ?? inputText.trim().length}
                    outputLength={optimizedTextFromFullCompletion(completion).length}
                    inLibrary={inLibrary}
                    feedbackDisabled={Boolean(user?.id && !historyId)}
                    onSavedToLibrary={() => setInLibrary(true)}
                    onFeedbackSubmitted={handleFeedbackSubmitted}
                    onRemediate={handleRemediate}
                    onTranslateOutput={handleTranslateOutput}
                  />
                ) : null
              }
            />
          </div>
        </div>

        {/* Mode + Optimize — below textareas, centered column */}
        <OptimizeControls
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          disabled={isLoading}
          canOptimize={inputText.trim().length > 0}
          isLoading={isLoading}
          onOptimize={() => void handleOptimize()}
          onDigest={handleProjectDigest}
          guestUsageVersion={guestUsageVersion}
          isAuthenticated={!!user}
        />

        {usageGateError && (
          <p className="shrink-0 px-6 pb-2 text-center text-sm text-red-400">
            {usageGateError}
          </p>
        )}

        {error && (
          <p className="shrink-0 px-6 pb-2 text-center text-sm text-red-400">
            {userFacingOptimizeError(error)}
          </p>
        )}

        <div className="mt-2 w-full shrink-0 px-6 pb-8">
          <ExplanationPanel
            explanation={explanation}
            original={inputText}
            optimized={optimizedTextFromFullCompletion(completion)}
          />
        </div>
        </ClientErrorBoundary>
      </main>

      {user && (
        <AppSettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          provider={provider}
          onProviderChange={setProvider}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          onSaveSuccess={refreshStats}
        />
      )}

      <DemoLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
      />

      <SignInRequiredModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        feature="the Library"
      />

      {user && (
        <aside className="fixed bottom-0 right-0 top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-72 md:block">
          <HistoryPanel
            userId={user.id}
            onSelect={handleHistorySelect}
            onDeleted={handleHistoryDeleted}
            onNewPrompt={resetComposerToNewPrompt}
            refreshTrigger={historyRefresh}
            selectedId={selectedHistoryItem?.id ?? null}
          />
        </aside>
      )}
    </div>
  );
}
