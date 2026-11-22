import * as React from "react"

function Button({ className, ...props }: React.ComponentProps<"button">) {
  return <button data-slot="button" className={className} {...props} />
}

export { Button }
