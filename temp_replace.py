import re, pathlib
path = pathlib.Path(r'apps/admin/src/app/(dashboard)/roles/[roleId]/page.tsx')
text = path.read_text(encoding='utf-8')
new_block = '''        actions={
          <div className="flex flex-col items-end gap-2">
            <div className="inline-flex items-center gap-1 rounded-lg border border-panel-border/80 bg-panel/60 p-1">
              <button
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab == "dialog"
                    ? "bg-accent/80 text-slate-900 shadow-glow"
                    : "text-slate-100 hover:bg-panel"
                }`}
                onClick={() => setActiveTab("dialog")}
              >
                對話管理
              </button>
              <button
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab == "assets"
                    ? "bg-accent/80 text-slate-900 shadow-glow"
                    : "text-slate-100 hover:bg-panel"
                }`}
                onClick={() => setActiveTab("assets")}
              >
                素材管理
              </button>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="rounded-lg border border-panel-border px-3 py-2 text-xs text-slate-100 hover:border-accent/60"
                onClick={() => router.push("/roles")}
              >
                <ArrowLeft className="mr-1 inline h-4 w-4" /> 回列表
              </button>
              <button
                className="rounded-lg border border-panel-border px-3 py-2 text-xs text-slate-100 hover:border-amber/60 disabled:opacity-60"
                onClick={save}
                disabled={saving}
              >
                <Save className="mr-1 inline h-4 w-4" /> {saving ? "儲存中…" : "儲存變更"}
              </button>
              <button
                className="rounded-lg bg-accent/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-glow"
                onClick={preview}
              >
                <Eye className="mr-1 inline h-4 w-4" /> 預覽到前台
              </button>
              <button
                className="rounded-lg border border-danger/60 px-3 py-2 text-xs text-danger hover:bg-danger/10"
                onClick={deleteAndBack}
              >
                <Trash2 className="mr-1 inline h-4 w-4" /> 刪除角色
              </button>
            </div>
          </div>
        }
      />'''
text_new, n = re.subn(r'actions=\{[\s\S]*?\}\s*/>', new_block, text, count=1)
if n != 1:
    raise SystemExit(f'replaced {n} blocks, expected 1')
path.write_text(text_new, encoding='utf-8')
