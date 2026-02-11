import pathlib
text_path = pathlib.Path(r'apps/admin/src/app/(dashboard)/roles/[roleId]/page.tsx')
text = text_path.read_text(encoding='utf-8')
start = '      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">'
wrapper_start = '      {activeTab === "dialog" ? (\n      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">'
if start not in text:
    raise SystemExit('start marker not found')
text = text.replace(start, wrapper_start, 1)
assets_block = '''        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto lg:grid-cols-2">
          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-50">文生圖 · Wan 2.2</p>
              <span className="text-[10px] text-muted">文本 → 帥哥圖，生成後可存庫</span>
            </div>
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              className="min-h-[110px] w-full resize-none rounded border border-panel-border bg-panel p-3 text-xs text-slate-50"
              placeholder="提示詞"
            />
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg bg-accent/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-glow disabled:opacity-50"
                onClick={runImage}
                disabled={assetLoading === "image"}
              >
                {assetLoading === "image" ? (
                  <span className="inline-flex items-center gap-1"><Loader2 className="h-4 w-4 animate-spin" /> 生成中…</span>
                ) : (
                  <span className="inline-flex items-center gap-1"><Image className="h-4 w-4" /> 生成帥哥圖</span>
                )}
              </button>
              {imageResult?.imageUrl && (
                <button
                  className="rounded-lg border border-panel-border px-3 py-2 text-xs text-slate-100 hover:border-accent/60 disabled:opacity-50"
                  onClick={saveImageAsset}
                  disabled={assetLoading === "saveImage"}
                >
                  {assetLoading === "saveImage" ? "保存中…" : "保存這張圖"}
                </button>
              )}
            </div>
            {imageResult?.imageUrl && (
              <div className="grid gap-2 rounded-lg border border-panel-border bg-panel/70 p-3">
                <div
                  className="aspect-[4/5] w-full rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url(${imageResult.imageUrl})` }}
                />
                <div className="text-[11px] text-muted">Model: {imageResult.model}</div>
              </div>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-50">圖生視頻 · Wan 2.2</p>
              <span className="text-[10px] text-muted">需先生成圖片</span>
            </div>
            <textarea
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              className="min-h-[110px] w-full resize-none rounded border border-panel-border bg-panel p-3 text-xs text-slate-50"
              placeholder="運鏡/氛圍/動作提示"
              disabled={!imageResult}
            />
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg bg-accent/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-glow disabled:opacity-50"
                onClick={runVideo}
                disabled={!imageResult || assetLoading === "video"}
              >
                {assetLoading === "video" ? (
                  <span className="inline-flex items-center gap-1"><Loader2 className="h-4 w-4 animate-spin" /> 生成中…</span>
                ) : (
                  <span className="inline-flex items-center gap-1"><Clapperboard className="h-4 w-4" /> 圖生視頻</span>
                )}
              </button>
              {videoResult?.videoUrl && (
                <button
                  className="rounded-lg border border-panel-border px-3 py-2 text-xs text-slate-100 hover:border-accent/60 disabled:opacity-50"
                  onClick={saveVideoAsset}
                  disabled={assetLoading === "saveVideo"}
                >
                  {assetLoading === "saveVideo" ? "保存中…" : "保存視頻"}
                </button>
              )}
            </div>
            {videoResult?.videoUrl && (
              <div className="grid gap-2 rounded-lg border border-panel-border bg-panel/70 p-3">
                <video className="w-full rounded-lg" src={videoResult.videoUrl} controls playsInline />
                <div className="text-[11px] text-muted">{videoResult.model} · {videoResult.resolution} · {videoResult.duration}s</div>
              </div>
            )}
          </Card>

          {assetMessage && (
            <div className="lg:col-span-2 rounded-lg border border-panel-border bg-panel/70 px-3 py-2 text-xs text-slate-50">
              {assetMessage}
            </div>
          )}
        </div>'''
end_old = '      </div>\n    </div>\n  );\n}'
end_new = '      </div>\n      ) : (\n' + assets_block + '\n      )}\n    </div>\n  );\n}'
if end_old not in text:
    raise SystemExit('end marker not found')
text = text.replace(end_old, end_new, 1)
text_path.write_text(text, encoding='utf-8')
