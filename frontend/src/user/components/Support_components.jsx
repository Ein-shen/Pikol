import React from 'react'
import { ArrowLeft, ChevronRight} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const contacts = [
  {
    icon: '/code.png',
    label: 'Email Developer',
    value: 'Shensarsale25@gmail.com',
    href: 'mailto:Shensarsale25@gmail.com',
  },
  {
    icon: '🛟',
    label: 'Support',
    value: 'Pikolleague@support.com',
    href: 'mailto:Pikolleague@support.com',
  },
  {
    icon: '/ig.png',
    label: 'Follow Instagram',
    value: 'instagram.com/pikol_league',
    href: 'https://www.instagram.com/pikol_league/',
  },
  {
    icon: '/fb.png',
    label: 'Follow Facebook',
    value: 'facebook.com/pikol_league',
    href: 'https://www.facebook.com/pikol_league/',
  },
  {
    icon: '/tt.png',
    label: 'Follow TikTok',
    value: 'tiktok.com/@pikol_league',
    href: 'https://www.tiktok.com/@pikol_league',
  },
  {
    icon: '/red.png',
    label: 'Follow Reddit',
    value: 'reddit.com/@pikol_league',
    href: 'https://www.reddit.com/r/reddit/ ',
  },
   {
    icon: '/x.png',
    label: 'Follow X',
    value: 'x.com/@pikol_league',
    href: 'https://www.x.com/  ',
  },
]



const isImage = (icon) =>
  /\.(png|jpe?g|svg|webp|gif)$/i.test(icon) || icon.startsWith('http')

export const Support_components = () => {
  const navigate = useNavigate()

  return (
    <div className="w-full flex flex-col gap-10">
      <header className="flex justify-between flex-row items-center">
        <button
          type="button"
          className="rounded-md p-2 opacity-60 transition hover:opacity-100"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft />
        </button>

        <h1 className="font-bold text-lg">Support</h1>

        <div className="w-10" />
      </header>

      <div className="theme-card theme-border border rounded-md w-[90%] mx-auto py-4 px-3 flex flex-col gap-4">
        {contacts.map((contact, index) => {
          const external = contact.href.startsWith('http')

          return (
            <a
              key={contact.label}
              href={contact.href}
              {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
              className={`flex items-center justify-between gap-3 px-3 font-mono transition-colors hover:opacity-80 ${
                index < contacts.length - 1 ? 'theme-border border-b pb-4' : ''
              }`}
            >
              {/* Left side: icon + text */}
              <span className="flex min-w-0 items-center gap-3">
                {isImage(contact.icon) ? (
                  <img
                    src={contact.icon}
                    alt=""
                    className="h-7 w-7 shrink-0 object-contain"
                  />
                ) : (
                  <span className="w-7 shrink-0 text-center text-2xl" aria-hidden="true">
                    {contact.icon}
                  </span>
                )}

                <span className="flex min-w-0 flex-col">
                  <span className="text-sm opacity-60">{contact.label}</span>
                  <span className="text-md break-all">{contact.value}</span>
                </span>
              </span>

              {/* Right side: chevron pinned to the edge */}
              <ChevronRight size={25} className="shrink-0 opacity-60" aria-hidden="true" />
            </a>
          )
        })}
      </div>
    </div>
  )
}