import { useEffect, useMemo, useRef, useState } from "react"
import "./SearchableSelect.css"

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  id: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  loading?: boolean
  loadError?: string | null
}

export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  loading,
  loadError,
}: SearchableSelectProps) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value) ?? null

  const filtered = useMemo(() => {
    if (!query) return options.slice(0, 50)
    const lq = query.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(lq)).slice(0, 50)
  }, [options, query])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        if (!selectedOption) setQuery("")
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [selectedOption])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setIsOpen(true)
    if (!e.target.value) onChange("")
  }

  function handleFocus() {
    setIsOpen(true)
    if (selectedOption) setQuery("")
  }

  function handleSelect(option: SelectOption) {
    onChange(option.value)
    setQuery("")
    setIsOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange("")
    setQuery("")
    setIsOpen(false)
  }

  const inputValue = selectedOption && !isOpen ? selectedOption.label : query

  return (
    <div ref={containerRef} className="ss-container">
      <div className="ss-input-wrap">
        <input
          id={id}
          type="text"
          className="ui-input ss-input"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={loading ? "Cargando..." : placeholder}
          disabled={!!loading}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            className="ss-clear"
            onMouseDown={handleClear}
            aria-label="Borrar selección"
          >
            ×
          </button>
        )}
      </div>
      {loadError && <p className="ss-load-error">{loadError}</p>}
      {isOpen && !loading && filtered.length > 0 && (
        <ul className="ss-dropdown" role="listbox">
          {filtered.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`ss-option${option.value === value ? " ss-option-selected" : ""}`}
              onMouseDown={() => handleSelect(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
      {isOpen && !loading && filtered.length === 0 && query && (
        <div className="ss-dropdown ss-empty">Sin resultados</div>
      )}
    </div>
  )
}
