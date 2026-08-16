"use client";

import { useState, useEffect, useMemo, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  Search,
  Star,
  LayoutGrid,
  Palette,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types & Constants ---

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  tags: string[];
  isFavorite: boolean;
  updatedAt: number;
}

const STORAGE_KEY = "modern-notes-data";
type NotesTab = "all" | "favorites";
type NoteDraft = Pick<Note, "title" | "content" | "color" | "tags" | "isFavorite">;

const PASTEL_COLORS = [
  { id: "default", value: "bg-background border-border", label: "Default" },
  { id: "red", value: "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900", label: "Red" },
  { id: "orange", value: "bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900", label: "Orange" },
  { id: "yellow", value: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-100 dark:border-yellow-900", label: "Yellow" },
  { id: "green", value: "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900", label: "Green" },
  { id: "blue", value: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900", label: "Blue" },
  { id: "teal", value: "bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900", label: "Teal" },
];

const INITIAL_NOTE: Note = {
  id: "welcome",
  title: "Welcome to Notes",
  content: "Your notes are now saved automatically to your browser!\n\n• They won't disappear on refresh\n• Click the trash icon to delete them",
  color: "default",
  tags: ["tutorial"],
  isFavorite: false,
  updatedAt: Date.now(),
};

const createEmptyDraft = (): NoteDraft => ({
  title: "",
  content: "",
  color: "default",
  tags: [],
  isFavorite: false,
});

const loadNotesFromStorage = (): Note[] => {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (!savedData) return [INITIAL_NOTE];

  try {
    const parsed = JSON.parse(savedData) as Note[];
    return parsed.length > 0 ? parsed : [INITIAL_NOTE];
  } catch {
    return [INITIAL_NOTE];
  }
};

// --- Main Component ---

export default function NoteTaking() {
  // State
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<NotesTab>("all");
  const [isMounted, setIsMounted] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Note>>({});
  const [tagInput, setTagInput] = useState("");

  // 1. Hydration & Loading Logic
  useEffect(() => {
    setIsMounted(true);
    setNotes(loadNotesFromStorage());
  }, []);

  // 2. Saving Logic (Auto-save to LocalStorage)
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    }
  }, [notes, isMounted]);

  // --- Actions ---

  const handleOpenModal = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setFormData({ ...note });
    } else {
      setEditingNote(null);
      setFormData(createEmptyDraft());
    }
    setTagInput("");
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.title?.trim() && !formData.content?.trim()) {
      setIsModalOpen(false);
      return;
    }

    const timestamp = Date.now();
    const normalizedTags = (formData.tags ?? []).reduce<string[]>((acc, tag) => {
      const cleanedTag = tag.trim();
      if (!cleanedTag) return acc;

      const alreadyIncluded = acc.some(
        (currentTag) => currentTag.toLowerCase() === cleanedTag.toLowerCase()
      );
      if (!alreadyIncluded) {
        acc.push(cleanedTag);
      }
      return acc;
    }, []);
    
    if (editingNote) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingNote.id
            ? { ...n, ...formData, tags: normalizedTags, updatedAt: timestamp }
            : n
        )
      );
    } else {
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: formData.title || "",
        content: formData.content || "",
        color: formData.color || "default",
        tags: normalizedTags,
        isFavorite: formData.isFavorite || false,
        updatedAt: timestamp,
      };
      setNotes((prev) => [newNote, ...prev]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this note permanently?")) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (editingNote?.id === id) setIsModalOpen(false);
    }
  };

  const togglePin = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isFavorite: !n.isFavorite } : n))
    );
  };

  const addTagToDraft = (rawTag: string) => {
    const tag = rawTag.trim().replace(/^#/, "");
    if (!tag) return;

    setFormData((previous) => {
      const currentTags = previous.tags ?? [];
      const exists = currentTags.some(
        (currentTag) => currentTag.toLowerCase() === tag.toLowerCase()
      );
      if (exists) return previous;

      return { ...previous, tags: [...currentTags, tag] };
    });
    setTagInput("");
  };

  const removeTagFromDraft = (tagToRemove: string) => {
    setFormData((previous) => ({
      ...previous,
      tags: (previous.tags ?? []).filter((tag) => tag !== tagToRemove),
    }));
  };

  // --- Filtering ---

  const filteredNotes = useMemo(() => {
    return notes
      .filter((note) => {
        const matchesSearch =
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesTab = activeTab === "all" || (activeTab === "favorites" && note.isFavorite);

        return matchesSearch && matchesTab;
      })
      .sort((a, b) => {
        if (a.isFavorite === b.isFavorite) return b.updatedAt - a.updatedAt;
        return a.isFavorite ? -1 : 1;
      });
  }, [notes, searchQuery, activeTab]);

  const getColorClass = (colorId: string) => 
    PASTEL_COLORS.find(c => c.id === colorId)?.value || PASTEL_COLORS[0].value;

  const favoriteCount = useMemo(
    () => notes.filter((note) => note.isFavorite).length,
    [notes]
  );

  // --- Render ---

  if (!isMounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100dvh-8rem)] rounded-[2rem] bg-gradient-to-b from-slate-50/90 via-white to-teal-50/40 font-sans text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-teal-950/20 dark:text-slate-100">
      
      {/* 1. Navbar */}
      <header className="glass-surface sticky top-2 z-40 mx-2 rounded-2xl border border-white/70 bg-white/75 dark:border-white/10 dark:bg-slate-900/75">
        <div className="container mx-auto flex flex-wrap items-center gap-3 px-4 py-3 sm:h-16 sm:flex-nowrap sm:py-0">
          <div className="order-1 mr-auto flex items-center gap-2">
            <div className="rounded-xl bg-teal-100 p-2 dark:bg-teal-900/40">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold tracking-tight">NoteSpace</h1>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Organized + Fast
              </p>
            </div>
          </div>

          <div className="order-3 relative basis-full sm:order-2 sm:max-w-md sm:flex-1 sm:basis-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="h-10 rounded-full border-transparent bg-white/70 pl-9 transition-all focus:bg-white dark:bg-slate-900/60 dark:focus:bg-slate-900"
            />
          </div>

          <div className="order-2 flex items-center gap-1 sm:order-3">
            <Button
              variant={activeTab === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("all")}
              className="rounded-full px-3 sm:px-4"
            >
              All
            </Button>
            <Button
              variant={activeTab === "favorites" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("favorites")}
              className="rounded-full px-3 sm:px-4"
            >
              Favorites
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-3 py-2.5 dark:border-slate-700/70 dark:bg-slate-900/65">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">All Notes</div>
            <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{notes.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-3 py-2.5 dark:border-slate-700/70 dark:bg-slate-900/65">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Favorites</div>
            <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{favoriteCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-3 py-2.5 dark:border-slate-700/70 dark:bg-slate-900/65">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Visible</div>
            <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{filteredNotes.length}</div>
          </div>
          <div className="rounded-2xl border border-teal-100/80 bg-teal-50/70 px-3 py-2.5 dark:border-teal-900/50 dark:bg-teal-950/20">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-teal-700 dark:text-teal-300">Auto Saved</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-teal-800 dark:text-teal-200">
              <Sparkles className="h-4 w-4" />
              Local browser storage
            </div>
          </div>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-slate-900">
              {searchQuery ? <Search className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
            </div>
            <p className="text-lg font-medium">
              {searchQuery ? "No notes match your search" : "Start by creating a note"}
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4 pb-24">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleOpenModal(note)}
                className={cn(
                  "group relative break-inside-avoid rounded-2xl border p-5 cursor-pointer hover:shadow-lg transition-all duration-300 ease-out",
                  getColorClass(note.color)
                )}
              >
                {/* Actions */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10"
                    onClick={(e) => togglePin(e, note.id)}
                  >
                    <Star
                      className={cn("w-4 h-4", note.isFavorite && "fill-yellow-500 text-yellow-500")}
                    />
                  </Button>
                </div>

                {note.isFavorite && (
                  <div className="absolute top-3 right-3 group-hover:opacity-0 transition-opacity">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  </div>
                )}

                <h3 className={cn("font-bold text-lg mb-2 leading-tight", !note.title && "text-muted-foreground italic")}>
                  {note.title || "Untitled"}
                </h3>
                
                <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-[8] leading-relaxed">
                  {note.content}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {note.tags.map((tag, index) => (
                     <Badge key={`${tag}-${index}`} variant="secondary" className="bg-black/5 dark:bg-white/10 text-[10px] hover:bg-black/10 h-5 px-1.5 font-normal text-foreground/70">
                       #{tag}
                     </Badge>
                  ))}
                  <div className="ml-auto text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                    {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 3. FAB */}
      <Button
        onClick={() => handleOpenModal()}
        size="lg"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 hover:bg-primary/90 active:scale-95 md:bottom-8 md:right-8"
      >
        <Plus className="w-7 h-7" />
        <span className="sr-only">Add Note</span>
      </Button>

      {/* 4. Edit/Create Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent 
          className={cn(
            "sm:max-w-[600px] p-0 gap-0 overflow-hidden border-0 shadow-2xl",
            getColorClass(formData.color || "default")
          )}
        >
          {/* Header with Padding */}
          <DialogHeader className="px-6 pt-6 pb-2">
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Title"
              className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 bg-transparent placeholder:text-muted-foreground/50"
            />
          </DialogHeader>
          
          {/* Body with INCREASED PADDING (p-6) */}
          <div className="flex-1 overflow-y-auto max-h-[60vh]">
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Take a note..."
              className="min-h-[300px] w-full resize-none text-base leading-relaxed border-none shadow-none focus-visible:ring-0 p-6 bg-transparent placeholder:text-muted-foreground/50"
            />
            <div className="border-t border-black/5 px-6 py-4 dark:border-white/10">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Tags
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTagToDraft(tagInput);
                    }
                  }}
                  placeholder="Add tag and press Enter"
                  className="h-9 bg-white/70 dark:bg-slate-900/60"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTagToDraft(tagInput)}
                  disabled={!tagInput.trim()}
                >
                  Add
                </Button>
              </div>
              {(formData.tags?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(formData.tags ?? []).map((tag, index) => (
                    <button
                      key={`${tag}-${index}`}
                      type="button"
                      onClick={() => removeTagFromDraft(tag)}
                      className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      #{tag} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 bg-black/5 dark:bg-black/20 flex items-center justify-between sm:justify-between">
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-black/5">
                    <Palette className="w-4 h-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 p-2">
                  <div className="grid grid-cols-4 gap-1">
                    {PASTEL_COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setFormData({ ...formData, color: c.id })}
                        className={cn(
                          "w-8 h-8 rounded-full border border-black/10",
                          c.value,
                          formData.color === c.id && "ring-2 ring-primary ring-offset-2"
                        )}
                        title={c.label}
                      />
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-full hover:bg-black/5", formData.isFavorite && "text-yellow-600")}
                onClick={() => setFormData({ ...formData, isFavorite: !formData.isFavorite })}
              >
                <Star className={cn("w-4 h-4", formData.isFavorite && "fill-current")} />
              </Button>

              {editingNote && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-red-100 text-red-600 hover:text-red-700"
                  onClick={() => handleDelete(editingNote.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="flex gap-2">
               <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Close</Button>
               <Button onClick={handleSave}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
