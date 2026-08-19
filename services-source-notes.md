# Houdini Services Source Notes

Source reviewed: https://houdini.co.za/services/

The official services page presents six service categories:

1. **Locks** — The company states that it carries a wide range of locks in Port Elizabeth and provides mobile call-out vehicles for lock problems.
2. **CCTV** — Tailor-made CCTV systems ranging from stand-alone installations to highly integrated systems with on-site or off-site monitoring.
3. **Safes** — Solutions ranging from basic wall safes to SABS- and insurance-approved categorised safes.
4. **Intercoms** — A wide range of intercom products for specific applications.
5. **Electric Fencing** — Electric fencing and outdoor motion detection are presented as perimeter-security options.
6. **Keys** — Key cutting from basic cylinder keys and car keys through to integrated master-keyed and restricted-keyway systems.

The homepage update preserves the existing card treatment, neon glow accents, centered icons, hover interaction, and service-card click behavior. The official page's “Book Now” / “Enquire Now” destination is https://houdini.co.za/book-online/; the project homepage cards use the existing internal contact CTA behavior unless a separate booking route is later requested.

## Asset Delivery Verification

The local development server returned HTTP 200 for the managed `/manus-storage/` paths, but the preview-domain browser request returned the application 404 page for the same path. The premium cards therefore use the browser-loadable official Houdini image URLs from the verified services page rather than the unresolved preview path. This prevents another broken-image experience in the homepage preview.
